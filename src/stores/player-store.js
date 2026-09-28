import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { ERROR_COPY } from '@/constants/error-copy'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'
import { toUserMessage } from '@/helpers/userError'
import { useOfflineStore } from '@/stores/offline-store'
import { isAppOffline } from '@/composables/useConnectivity'

/** @type {HTMLAudioElement|null} */
let audioEl = null

/** Prevent infinite stream<->local fallback loops */
let fallbackAttemptedFor = null

/**
 * Module-scoped audio keeps playing across SPA navigations.
 * Phase 1.1: never pause from visibilitychange / blur / pagehide alone.
 */
function getAudio() {
  if (typeof window === 'undefined') return null
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.preload = 'metadata'
    audioEl.crossOrigin = 'anonymous'
    audioEl.setAttribute('data-maxtune-audio', '1')
    audioEl.style.display = 'none'
    if (document.body) {
      document.body.appendChild(audioEl)
    } else {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          if (audioEl && !audioEl.isConnected) document.body.appendChild(audioEl)
        },
        { once: true },
      )
    }
  } else if (document.body && !audioEl.isConnected) {
    document.body.appendChild(audioEl)
  }
  return audioEl
}

const ARTWORK_SIZES = [96, 128, 192, 256, 384, 512]

function buildArtwork(coverUrl) {
  if (!coverUrl) return []
  return ARTWORK_SIZES.map((size) => ({
    src: coverUrl,
    sizes: `${size}x${size}`,
    type: 'image/jpeg',
  }))
}

function hasMediaSession() {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

function isBrowserOrEngineOffline() {
  return isAppOffline()
}

const SHUFFLE_KEY = 'maxtune-shuffle'
const REPEAT_KEY = 'maxtune-repeat'

function loadShufflePref() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(SHUFFLE_KEY) === 'true'
}

function loadRepeatPref() {
  if (typeof localStorage === 'undefined') return 'off'
  const v = localStorage.getItem(REPEAT_KEY)
  return v === 'one' || v === 'all' ? v : 'off'
}

/** Fisher-Yates copy */
function shuffleCopy(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function notifyPlayOffline() {
  Notify.create({
    type: 'negative',
    message: OFFLINE_COPY.err.playOffline,
    caption: OFFLINE_COPY.err.playOfflineHint,
    position: 'top',
    timeout: 3500,
  })
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    shuffle: loadShufflePref(),
    repeat: loadRepeatPref(), // off | one | all
    /** Unshuffled order while shuffle is on; null when shuffle off */
    originalQueue: null,
    positionMs: 0,
    durationMs: 0,
    volume: 0.9,
    bufferedPct: 0,
    error: null,
    sheetOpen: false,
    playingFromLocal: false,
    _bound: false,
    _mediaSessionBound: false,
  }),

  getters: {
    hasTrack: (state) => Boolean(state.currentTrack),
    displayTitle: (state) => state.currentTrack?.title || 'Nothing playing',
    displayArtist: (state) => state.currentTrack?.artist_name || '-',
    /** Cached cover for downloaded tracks (offline-safe), else the engine URL */
    coverUrl: (state) => useOfflineStore().coverFor(state.currentTrack),
    progressPct: (state) => {
      if (!state.durationMs) return 0
      return Math.min(100, (state.positionMs / state.durationMs) * 100)
    },
  },

  actions: {
    openSheet() {
      if (this.hasTrack) this.sheetOpen = true
    },

    closeSheet() {
      this.sheetOpen = false
    },

    bindAudioEvents() {
      if (this._bound) return
      const audio = getAudio()
      if (!audio) return

      audio.volume = this.volume

      audio.addEventListener('timeupdate', () => {
        this.positionMs = Math.round(audio.currentTime * 1000)
        if (audio.buffered.length) {
          const end = audio.buffered.end(audio.buffered.length - 1)
          this.bufferedPct = audio.duration ? (end / audio.duration) * 100 : 0
        }
        this.updateMediaSessionPosition()
      })

      audio.addEventListener('loadedmetadata', () => {
        this.durationMs = Math.round((audio.duration || 0) * 1000)
        this.updateMediaSessionPosition()
      })

      audio.addEventListener('play', () => {
        this.isPlaying = true
        this.syncMediaSessionPlaybackState()
      })

      audio.addEventListener('pause', () => {
        this.isPlaying = false
        this.syncMediaSessionPlaybackState()
      })

      audio.addEventListener('ended', () => {
        if (this.repeat === 'one') {
          audio.currentTime = 0
          audio.play().catch(() => {})
          return
        }
        this.isPlaying = false
        this.positionMs = 0
        this.playNext({ auto: true })
      })

      audio.addEventListener('error', () => {
        this.handlePlaybackError().catch(() => {})
      })

      this._bound = true
      this.bindMediaSessionHandlers()
    },

    /**
     * Auto-fallback: online stream fail -> local blob once (O4).
     */
    async handlePlaybackError() {
      const track = this.currentTrack
      if (!track) {
        this.isPlaying = false
        this.error = 'Playback failed'
        this.syncMediaSessionPlaybackState()
        return
      }

      const trackKey = String(track.id)
      if (fallbackAttemptedFor === trackKey || this.playingFromLocal) {
        this.isPlaying = false
        this.error = 'Playback failed'
        this.syncMediaSessionPlaybackState()
        return
      }

      const offline = useOfflineStore()
      if (!offline.isDownloaded(track.id)) {
        this.isPlaying = false
        this.error = 'Playback failed'
        this.syncMediaSessionPlaybackState()
        return
      }

      fallbackAttemptedFor = trackKey
      const ok = await this.playFromLocal(track)
      if (!ok) {
        this.isPlaying = false
        this.error = 'Playback failed'
        this.syncMediaSessionPlaybackState()
      }
    },

    bindMediaSessionHandlers() {
      if (this._mediaSessionBound || !hasMediaSession()) return

      const ms = navigator.mediaSession
      try {
        ms.setActionHandler('play', () => {
          this.resumeFromMediaSession().catch(() => {})
        })
        ms.setActionHandler('pause', () => {
          const audio = getAudio()
          if (audio && !audio.paused) audio.pause()
        })
        ms.setActionHandler('previoustrack', () => {
          this.playPrev().catch(() => {})
        })
        ms.setActionHandler('nexttrack', () => {
          this.playNext().catch(() => {})
        })
        ms.setActionHandler('seekto', (details) => {
          const audio = getAudio()
          if (!audio || !audio.duration) return
          if (details.fastSeek && typeof audio.fastSeek === 'function') {
            audio.fastSeek(details.seekTime)
          } else if (typeof details.seekTime === 'number') {
            audio.currentTime = details.seekTime
          }
          this.positionMs = Math.round(audio.currentTime * 1000)
          this.updateMediaSessionPosition()
        })
      } catch {
        // Some handlers unsupported on certain platforms - ignore.
      }

      this._mediaSessionBound = true
    },

    updateMediaSessionMetadata() {
      if (!hasMediaSession()) return
      const track = this.currentTrack
      if (!track) {
        try {
          navigator.mediaSession.metadata = null
          navigator.mediaSession.playbackState = 'none'
        } catch {
          // ignore
        }
        return
      }

      const cover = this.coverUrl
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Unknown title',
          artist: track.artist_name || 'Unknown artist',
          album: track.album_name || 'MaxTune',
          artwork: buildArtwork(cover),
        })
      } catch {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || 'Unknown title',
            artist: track.artist_name || 'Unknown artist',
            album: track.album_name || 'MaxTune',
          })
        } catch {
          // ignore
        }
      }
      this.syncMediaSessionPlaybackState()
      this.updateMediaSessionPosition()
    },

    syncMediaSessionPlaybackState() {
      if (!hasMediaSession()) return
      try {
        if (!this.currentTrack) {
          navigator.mediaSession.playbackState = 'none'
        } else {
          navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused'
        }
      } catch {
        // ignore
      }
    },

    updateMediaSessionPosition() {
      if (!hasMediaSession() || typeof navigator.mediaSession.setPositionState !== 'function')
        return
      const audio = getAudio()
      const duration = audio?.duration
      if (!duration || !Number.isFinite(duration) || duration <= 0) return
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: audio.playbackRate || 1,
          position: Math.min(duration, Math.max(0, audio.currentTime || 0)),
        })
      } catch {
        // ignore invalid position state
      }
    },

    /**
     * @param {object} track
     * @returns {Promise<boolean>}
     */
    async playFromLocal(track) {
      const offline = useOfflineStore()
      const blobUrl = await offline.getLocalBlobUrl(track.id)
      if (!blobUrl) return false

      this.bindAudioEvents()
      const audio = getAudio()
      if (!audio) return false

      // Revoke previous track blob URL if switching away
      if (this.currentTrack?.id && this.currentTrack.id !== track.id && this.playingFromLocal) {
        offline.revokeBlobUrl(this.currentTrack.id)
      }

      this.error = null
      this.playingFromLocal = true
      this.currentTrack = track
      this.positionMs = 0
      this.durationMs = track.duration_ms || 0
      this.updateMediaSessionMetadata()

      audio.src = blobUrl
      audio.load()

      try {
        await audio.play()
        this.isPlaying = true
        this.syncMediaSessionPlaybackState()
        return true
      } catch (err) {
        this.isPlaying = false
        this.error = toUserMessage(err, ERROR_COPY.action.play, {
          context: 'playback',
          allowServerMessage: false,
        })
        this.syncMediaSessionPlaybackState()
        return false
      }
    },

    /**
     * @param {object} track
     * @param {object[]} [queue]
     */
    async playTrack(track, queue) {
      this.bindAudioEvents()
      const audio = getAudio()
      if (!audio) return

      if (Array.isArray(queue)) {
        this.setQueue(queue, track?.id)
      }

      fallbackAttemptedFor = null
      this.error = null

      const offline = useOfflineStore()
      await offline.hydrate()

      const preferLocal = isBrowserOrEngineOffline()

      if (preferLocal) {
        if (offline.isDownloaded(track.id)) {
          const ok = await this.playFromLocal(track)
          if (ok) return
        }
        notifyPlayOffline()
        this.error = OFFLINE_COPY.err.playOffline
        // Keep previous track if any; else clear current selection without spinning
        if (!this.currentTrack || this.currentTrack.id === track.id) {
          // Still set current for UI context but do not load remote
          this.currentTrack = track
          this.isPlaying = false
          this.playingFromLocal = false
        }
        this.syncMediaSessionPlaybackState()
        return
      }

      const streamUrl = toEngineProxyUrl(track.stream_url)
      if (!streamUrl) {
        // Try local as last resort
        if (offline.isDownloaded(track.id)) {
          const ok = await this.playFromLocal(track)
          if (ok) return
        }
        this.error = 'No stream URL for this track'
        return
      }

      // Revoke previous local URL when switching to network
      if (this.currentTrack?.id && this.playingFromLocal) {
        offline.revokeBlobUrl(this.currentTrack.id)
      }

      this.playingFromLocal = false
      this.currentTrack = track
      this.positionMs = 0
      this.durationMs = track.duration_ms || 0
      this.updateMediaSessionMetadata()

      const absolute = new URL(streamUrl, window.location.origin).href
      if (audio.src !== absolute) {
        audio.src = streamUrl
        audio.load()
      }

      try {
        await audio.play()
        this.isPlaying = true
        this.syncMediaSessionPlaybackState()
      } catch (err) {
        // Network play failed - try local once
        if (offline.isDownloaded(track.id)) {
          fallbackAttemptedFor = String(track.id)
          const ok = await this.playFromLocal(track)
          if (ok) return
        }
        this.isPlaying = false
        this.error = toUserMessage(err, ERROR_COPY.action.play, {
          context: 'playback',
          allowServerMessage: false,
        })
        this.syncMediaSessionPlaybackState()
      }
    },

    /**
     * @param {object[]} tracks
     * @param {number} [startIndex]
     */
    async playQueue(tracks, startIndex = 0) {
      if (!tracks?.length) return
      const idx = Math.min(Math.max(0, startIndex), tracks.length - 1)
      await this.playTrack(tracks[idx], tracks)
    },

    queueIndex() {
      if (!this.currentTrack || !this.queue.length) return -1
      return this.queue.findIndex((t) => t.id === this.currentTrack.id)
    },

    /**
     * @param {{ auto?: boolean }} [opts]
     */
    async playNext(opts = {}) {
      // Advance in-context — do NOT re-pass queue (setQueue would re-shuffle / corrupt originalQueue).
      const idx = this.queueIndex()
      if (idx < 0 || !this.queue.length) return

      if (idx < this.queue.length - 1) {
        await this.playTrack(this.queue[idx + 1])
        return
      }

      if (this.repeat === 'all') {
        await this.playTrack(this.queue[0])
        return
      }

      if (!opts.auto) {
        // stay on last track when user hits next
      }
    },

    async playPrev() {
      const audio = getAudio()
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0
        this.positionMs = 0
        this.updateMediaSessionPosition()
        return
      }

      const idx = this.queueIndex()
      if (idx > 0) {
        await this.playTrack(this.queue[idx - 1])
      } else if (audio) {
        audio.currentTime = 0
        this.positionMs = 0
        this.updateMediaSessionPosition()
      }
    },

    async resumeFromMediaSession() {
      if (!this.currentTrack) return
      this.bindAudioEvents()
      const audio = getAudio()
      if (!audio) return

      if (audio.paused && audio.src) {
        try {
          await audio.play()
        } catch (err) {
          this.error = toUserMessage(err, ERROR_COPY.action.resume, {
            context: 'resume',
            allowServerMessage: false,
          })
        }
        return
      }

      if (!audio.src) {
        await this.playTrack(this.currentTrack)
      }
    },

    async togglePlay() {
      if (!this.currentTrack) return
      this.bindAudioEvents()
      const audio = getAudio()
      if (!audio) return

      if (this.isPlaying) {
        audio.pause()
        return
      }

      if (!audio.src) {
        await this.playTrack(this.currentTrack)
        return
      }

      try {
        await audio.play()
      } catch (err) {
        this.error = toUserMessage(err, ERROR_COPY.action.resume, {
          context: 'resume',
          allowServerMessage: false,
        })
      }
    },

    /**
     * @param {number} pct 0-100
     */
    seekPct(pct) {
      const audio = getAudio()
      if (!audio || !audio.duration) return
      const clamped = Math.min(100, Math.max(0, pct))
      audio.currentTime = (clamped / 100) * audio.duration
      this.positionMs = Math.round(audio.currentTime * 1000)
      this.updateMediaSessionPosition()
    },

    /**
     * @param {number} value 0-1
     */
    setVolume(value) {
      this.volume = Math.min(1, Math.max(0, value))
      const audio = getAudio()
      if (audio) audio.volume = this.volume
    },

    persistPlaybackPrefs() {
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(SHUFFLE_KEY, this.shuffle ? 'true' : 'false')
        localStorage.setItem(REPEAT_KEY, this.repeat)
      } catch {
        // ignore quota / private mode
      }
    },

    /**
     * Keep current track first; shuffle the rest.
     * @param {object[]} tracks
     * @param {string|number|undefined|null} currentId
     */
    applyShuffleToQueue(tracks, currentId) {
      const list = Array.isArray(tracks) ? [...tracks] : []
      if (!list.length) return list
      const current =
        currentId != null && currentId !== '' ? list.find((t) => t.id === currentId) : null
      const rest = current ? list.filter((t) => t.id !== current.id) : list
      return current ? [current, ...shuffleCopy(rest)] : shuffleCopy(rest)
    },

    /**
     * @param {object[]} tracks
     * @param {string|number|undefined|null} [currentId]
     */
    setQueue(tracks, currentId) {
      const list = Array.isArray(tracks) ? [...tracks] : []
      if (this.shuffle && list.length) {
        this.originalQueue = list
        this.queue = this.applyShuffleToQueue(list, currentId ?? this.currentTrack?.id)
      } else {
        this.queue = list
        this.originalQueue = null
      }
    },

    toggleShuffle() {
      if (!this.shuffle) {
        if (this.queue.length) {
          this.originalQueue = [...this.queue]
          this.queue = this.applyShuffleToQueue(this.queue, this.currentTrack?.id)
        }
        this.shuffle = true
      } else {
        if (this.originalQueue?.length) {
          this.queue = [...this.originalQueue]
        }
        this.originalQueue = null
        this.shuffle = false
      }
      this.persistPlaybackPrefs()
    },

    /** Cycle off -> all -> one -> off */
    cycleRepeat() {
      const order = ['off', 'all', 'one']
      const idx = order.indexOf(this.repeat)
      this.repeat = order[(idx + 1) % order.length]
      this.persistPlaybackPrefs()
    },

    clear() {
      const audio = getAudio()
      const offline = useOfflineStore()
      if (this.currentTrack?.id && this.playingFromLocal) {
        offline.revokeBlobUrl(this.currentTrack.id)
      }
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
      this.currentTrack = null
      this.queue = []
      this.originalQueue = null
      this.isPlaying = false
      this.playingFromLocal = false
      this.positionMs = 0
      this.durationMs = 0
      this.error = null
      this.sheetOpen = false
      fallbackAttemptedFor = null
      this.updateMediaSessionMetadata()
    },
  },
})
