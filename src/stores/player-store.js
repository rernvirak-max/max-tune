import { defineStore } from 'pinia'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'

/** @type {HTMLAudioElement|null} */
let audioEl = null

function getAudio() {
  if (typeof window === 'undefined') return null
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.preload = 'metadata'
    audioEl.crossOrigin = 'anonymous'
  }
  return audioEl
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
    _bound: false,
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
      })

      audio.addEventListener('loadedmetadata', () => {
        this.durationMs = Math.round((audio.duration || 0) * 1000)
        if (!this.currentTrack?.duration_ms && this.durationMs) {
          // keep UI in sync when tags lacked duration
        }
      })

      audio.addEventListener('play', () => {
        this.isPlaying = true
      })

      audio.addEventListener('pause', () => {
        this.isPlaying = false
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
      })

      this._bound = true
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

      if (audio.src !== new URL(streamUrl, window.location.origin).href) {
        audio.src = streamUrl
        audio.load()
      }

      try {
        await audio.play()
        this.isPlaying = true
      } catch (err) {
        this.isPlaying = false
        this.error = err?.message || 'Could not start playback'
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
        return
      }

      const idx = this.queueIndex()
      if (idx > 0) {
        await this.playTrack(this.queue[idx - 1], this.queue)
      } else if (audio) {
        audio.currentTime = 0
        this.positionMs = 0
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
    },
  },
})
