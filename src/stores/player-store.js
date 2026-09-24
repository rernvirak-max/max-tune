import { defineStore } from 'pinia'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'

/** @type {HTMLAudioElement|null} */
let audioEl = null

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
    // Keep element in the document tree — helps some Chromium background paths.
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

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    shuffle: false,
    repeat: 'off', // off | one | all
    positionMs: 0,
    durationMs: 0,
    volume: 0.9,
    bufferedPct: 0,
    error: null,
    sheetOpen: false,
    _bound: false,
    _mediaSessionBound: false,
  }),

  getters: {
    hasTrack: (state) => Boolean(state.currentTrack),
    displayTitle: (state) => state.currentTrack?.title || 'Nothing playing',
    displayArtist: (state) => state.currentTrack?.artist_name || '—',
    coverUrl: (state) => toEngineProxyUrl(state.currentTrack?.cover_url),
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
        this.isPlaying = false
        this.error = 'Playback failed'
        this.syncMediaSessionPlaybackState()
      })

      this._bound = true
      this.bindMediaSessionHandlers()
    },

    bindMediaSessionHandlers() {
      if (this._mediaSessionBound || !hasMediaSession()) return

      const ms = navigator.mediaSession
      try {
        ms.setActionHandler('play', () => {
          // Resume only — never toggle (OS Play must not pause on desync).
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
        // Some handlers unsupported on certain platforms — ignore.
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
        // MediaMetadata may fail without artwork URLs on some engines
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
      if (!hasMediaSession() || typeof navigator.mediaSession.setPositionState !== 'function') return
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
     * @param {object[]} [queue]
     */
    async playTrack(track, queue) {
      this.bindAudioEvents()
      const audio = getAudio()
      if (!audio) return

      const streamUrl = toEngineProxyUrl(track.stream_url)
      if (!streamUrl) {
        this.error = 'No stream URL for this track'
        return
      }

      if (Array.isArray(queue)) {
        this.queue = queue
      }

      this.error = null
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
        this.isPlaying = false
        this.error = err?.message || 'Could not start playback'
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
      const idx = this.queueIndex()
      if (idx < 0 || !this.queue.length) return

      if (idx < this.queue.length - 1) {
        await this.playTrack(this.queue[idx + 1], this.queue)
        return
      }

      if (this.repeat === 'all') {
        await this.playTrack(this.queue[0], this.queue)
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
        await this.playTrack(this.queue[idx - 1], this.queue)
      } else if (audio) {
        audio.currentTime = 0
        this.positionMs = 0
        this.updateMediaSessionPosition()
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
        this.error = err?.message || 'Could not resume'
      }
    },

    /**
     * @param {number} pct 0–100
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
     * @param {number} value 0–1
     */
    setVolume(value) {
      this.volume = Math.min(1, Math.max(0, value))
      const audio = getAudio()
      if (audio) audio.volume = this.volume
    },

    clear() {
      const audio = getAudio()
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
      this.currentTrack = null
      this.queue = []
      this.isPlaying = false
      this.positionMs = 0
      this.durationMs = 0
      this.error = null
      this.sheetOpen = false
      this.updateMediaSessionMetadata()
    },
  },
})
