import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import { OFFLINE_COPY, WIFI_ONLY_STORAGE_KEY } from '@/constants/offline-copy'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'
import * as offlineDb from '@/services/offline-db'

/** @type {Map<string|number, string>} live object URLs for local blobs */
const blobUrls = new Map()

function loadWifiOnly() {
  if (typeof localStorage === 'undefined') return true
  const raw = localStorage.getItem(WIFI_ONLY_STORAGE_KEY)
  if (raw === null) return true
  return raw !== 'false'
}

/**
 * Engine-owned audio (upload / stored import). Link-only / Jamendo = not downloadable.
 * @param {object|null|undefined} track
 */
export function isTrackDownloadable(track) {
  if (!track) return false
  if (track.import_mode === 'linked') return false
  if (track.source === 'jamendo' && track.import_mode !== 'stored') return false

  const stream = track.stream_url
  if (!stream) return false

  try {
    const url = new URL(stream, typeof window !== 'undefined' ? window.location.origin : 'http://local')
    const host = url.hostname.toLowerCase()
    if (host.includes('jamendo.com') || host.includes('jamendo.')) return false
    // Signed engine stream: /api/tracks/{id}/stream
    if (url.pathname.includes('/tracks/') && url.pathname.includes('/stream')) return true
    // Same-origin /engine proxy path after toEngineProxyUrl
    if (url.pathname.startsWith('/engine/api/tracks/') && url.pathname.includes('/stream')) {
      return true
    }
  } catch {
    // fall through
  }

  // Stored uploads always have size + mime from engine
  if (track.import_mode === 'stored' || track.source === 'upload') {
    return Boolean(stream)
  }

  return false
}

/**
 * @returns {boolean} true when downloads should be blocked for cellular
 */
export function isCellularConnection() {
  if (typeof navigator === 'undefined') return false
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!conn) return false
  if (conn.type === 'cellular') return true
  // Some Chromium builds expose effectiveType without type on cell
  if (conn.type === 'none') return false
  if (!conn.type && typeof conn.effectiveType === 'string') {
    // Cannot reliably detect Wi-Fi vs cell from effectiveType alone - do not block.
    return false
  }
  return false
}

/**
 * @param {number} bytes
 */
export function formatStorageBytes(bytes) {
  const n = Math.max(0, Number(bytes) || 0)
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function notifyDark(opts) {
  Notify.create({
    position: 'top',
    timeout: 3000,
    ...opts,
  })
}

export const useOfflineStore = defineStore('offline', {
  state: () => ({
    /** @type {Record<string, { id: string|number, meta: object, sizeBytes: number, downloadedAt: number }>} */
    downloaded: {},
    /** @type {Record<string, { status: 'queued'|'downloading'|'error', pct: number, error?: string }>} */
    progress: {},
    wifiOnly: loadWifiOnly(),
    totalBytes: 0,
    hydrated: false,
    hydrating: false,
    /** playlist download job */
    playlistJob: null,
  }),

  getters: {
    downloadedList: (state) =>
      Object.values(state.downloaded).sort(
        (a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0),
      ),
    downloadedCount: (state) => Object.keys(state.downloaded).length,
    isDownloaded: (state) => (trackId) => Boolean(state.downloaded[String(trackId)]),
    getProgress: (state) => (trackId) => state.progress[String(trackId)] || null,
  },

  actions: {
    async hydrate() {
      if (this.hydrated || this.hydrating) return
      this.hydrating = true
      try {
        const rows = await offlineDb.listTracks()
        /** @type {Record<string, object>} */
        const map = {}
        let total = 0
        for (const row of rows) {
          const key = String(row.id)
          map[key] = {
            id: row.id,
            meta: row.meta,
            sizeBytes: row.sizeBytes || 0,
            downloadedAt: row.downloadedAt || 0,
          }
          total += row.sizeBytes || 0
        }
        this.downloaded = map
        this.totalBytes = total
        this.hydrated = true
      } catch (err) {
        console.warn('[offline] hydrate failed', err)
      } finally {
        this.hydrating = false
      }
    },

    setWifiOnly(value) {
      this.wifiOnly = Boolean(value)
      localStorage.setItem(WIFI_ONLY_STORAGE_KEY, this.wifiOnly ? 'true' : 'false')
    },

    isDownloadable(track) {
      return isTrackDownloadable(track)
    },

    /**
     * @returns {{ ok: true }|{ ok: false, reason: 'wifi'|'offline' }}
     */
    canStartDownload() {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { ok: false, reason: 'offline' }
      }
      if (this.wifiOnly && isCellularConnection()) {
        return { ok: false, reason: 'wifi' }
      }
      return { ok: true }
    },

    /**
     * @param {object} track
     * @param {{ silent?: boolean }} [opts]
     */
    async downloadTrack(track, opts = {}) {
      if (!track?.id) return { ok: false, reason: 'invalid' }

      const key = String(track.id)
      if (this.downloaded[key]) return { ok: true, already: true }

      if (!isTrackDownloadable(track)) {
        if (!opts.silent) {
          notifyDark({ type: 'warning', message: OFFLINE_COPY.err.linked })
        }
        return { ok: false, reason: 'linked' }
      }

      const gate = this.canStartDownload()
      if (!gate.ok) {
        if (!opts.silent) {
          notifyDark({
            type: 'warning',
            message: gate.reason === 'wifi' ? OFFLINE_COPY.err.wifiOnly : OFFLINE_COPY.err.mutation,
          })
        }
        return { ok: false, reason: gate.reason }
      }

      const streamUrl = toEngineProxyUrl(track.stream_url)
      if (!streamUrl) {
        return { ok: false, reason: 'no-stream' }
      }

      const estimatedNeed = track.size || 0
      if (estimatedNeed > 0) {
        const est = await offlineDb.estimateStorage()
        if (est && est.quota > 0) {
          const remaining = est.quota - est.usage
          if (estimatedNeed > remaining) {
            if (!opts.silent) {
              notifyDark({ type: 'negative', message: OFFLINE_COPY.err.storageFull })
            }
            return { ok: false, reason: 'storage' }
          }
        }
      }

      this.progress = {
        ...this.progress,
        [key]: { status: 'downloading', pct: 0 },
      }

      try {
        const token =
          typeof localStorage !== 'undefined' ? localStorage.getItem('max_tune_token') : null
        const headers = {
          Accept: '*/*',
          'X-Requested-With': 'XMLHttpRequest',
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(streamUrl, {
          method: 'GET',
          headers,
          credentials: 'same-origin',
        })

        if (!res.ok) {
          throw new Error(`Download failed (${res.status})`)
        }

        const contentLength = Number(res.headers.get('content-length') || 0)
        const reader = res.body?.getReader()
        /** @type {Uint8Array[]} */
        const chunks = []
        let received = 0

        if (reader) {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
            received += value.byteLength
            const total = contentLength || track.size || 0
            const pct = total ? Math.min(99, Math.round((received / total) * 100)) : 0
            this.progress = {
              ...this.progress,
              [key]: { status: 'downloading', pct },
            }
          }
        } else {
          const buf = await res.arrayBuffer()
          chunks.push(new Uint8Array(buf))
          received = buf.byteLength
        }

        const mime = res.headers.get('content-type') || track.mime || 'audio/mpeg'
        const audioBlob = new Blob(chunks, { type: mime })
        const sizeBytes = audioBlob.size

        /** @type {Blob|null} */
        let coverBlob = null
        const coverUrl = toEngineProxyUrl(track.cover_url)
        if (coverUrl) {
          try {
            const coverRes = await fetch(coverUrl, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: 'same-origin',
            })
            if (coverRes.ok) coverBlob = await coverRes.blob()
          } catch {
            // optional cover - ignore
          }
        }

        const meta = {
          id: track.id,
          title: track.title,
          artist_name: track.artist_name,
          album_name: track.album_name,
          duration_ms: track.duration_ms,
          mime: track.mime || mime,
          size: sizeBytes,
          source: track.source,
          import_mode: track.import_mode,
          liked: track.liked,
          cover_url: track.cover_url,
          stream_url: track.stream_url,
        }

        await offlineDb.putTrack({
          id: track.id,
          meta,
          audioBlob,
          coverBlob,
          sizeBytes,
          downloadedAt: Date.now(),
        })

        this.downloaded = {
          ...this.downloaded,
          [key]: {
            id: track.id,
            meta,
            sizeBytes,
            downloadedAt: Date.now(),
          },
        }
        this.totalBytes = Object.values(this.downloaded).reduce(
          (s, row) => s + (row.sizeBytes || 0),
          0,
        )

        const nextProgress = { ...this.progress }
        delete nextProgress[key]
        this.progress = nextProgress

        return { ok: true, sizeBytes }
      } catch (err) {
        const message = err?.name === 'QuotaExceededError' ? OFFLINE_COPY.err.storageFull : null
        this.progress = {
          ...this.progress,
          [key]: {
            status: 'error',
            pct: 0,
            error: message || err?.message || 'failed',
          },
        }
        if (!opts.silent) {
          notifyDark({
            type: 'negative',
            message: message || OFFLINE_COPY.err.downloadFail,
          })
        }
        return {
          ok: false,
          reason: message ? 'storage' : 'error',
          error: err,
        }
      }
    },

    /**
     * @param {object[]} tracks
     * @param {{ playlistId?: string|number }} [opts]
     */
    async downloadPlaylist(tracks, opts = {}) {
      const list = Array.isArray(tracks) ? tracks : []
      const downloadable = list.filter((t) => isTrackDownloadable(t) && !this.downloaded[String(t.id)])
      const already = list.filter((t) => this.downloaded[String(t.id)])
      const skipped = list.filter((t) => !isTrackDownloadable(t))

      const aboutBytes = downloadable.reduce((s, t) => s + (t.size || 0), 0)
      if (aboutBytes > 0) {
        const est = await offlineDb.estimateStorage()
        if (est && est.quota > 0 && aboutBytes > est.quota - est.usage) {
          notifyDark({ type: 'negative', message: OFFLINE_COPY.err.storageFull })
          return {
            ok: false,
            reason: 'storage',
            skipped: skipped.length,
            done: 0,
            total: downloadable.length,
          }
        }
      }

      const gate = this.canStartDownload()
      if (!gate.ok) {
        notifyDark({
          type: 'warning',
          message: gate.reason === 'wifi' ? OFFLINE_COPY.err.wifiOnly : OFFLINE_COPY.err.mutation,
        })
        return { ok: false, reason: gate.reason, skipped: skipped.length }
      }

      this.playlistJob = {
        playlistId: opts.playlistId ?? null,
        done: already.length,
        total: downloadable.length + already.length,
        skipped: skipped.length,
        status: 'running',
        aboutBytes: aboutBytes + already.reduce((s, t) => s + (this.downloaded[String(t.id)]?.sizeBytes || 0), 0),
      }

      let succeeded = already.length
      for (const track of downloadable) {
        const result = await this.downloadTrack(track, { silent: true })
        if (result.ok) {
          succeeded += 1
        } else if (result.reason === 'storage' || result.reason === 'wifi') {
          break
        }
        this.playlistJob = {
          ...this.playlistJob,
          done: succeeded,
          status: 'running',
        }
      }

      this.playlistJob = {
        ...this.playlistJob,
        done: succeeded,
        status: 'done',
        skipped: skipped.length,
      }

      return {
        ok: true,
        done: succeeded,
        total: downloadable.length + already.length,
        skipped: skipped.length,
      }
    },

    clearPlaylistJob() {
      this.playlistJob = null
    },

    /**
     * @param {number|string} trackId
     * @returns {Promise<string|null>} object URL
     */
    async getLocalBlobUrl(trackId) {
      const key = String(trackId)
      if (blobUrls.has(key)) return blobUrls.get(key)

      const row = await offlineDb.getTrack(trackId)
      if (!row?.audioBlob) return null

      const url = URL.createObjectURL(row.audioBlob)
      blobUrls.set(key, url)
      return url
    },

    /**
     * @param {number|string} trackId
     * @returns {Promise<object|null>}
     */
    async getLocalMeta(trackId) {
      const key = String(trackId)
      const cached = this.downloaded[key]
      if (cached?.meta) return cached.meta
      const row = await offlineDb.getTrack(trackId)
      return row?.meta || null
    },

    revokeBlobUrl(trackId) {
      const key = String(trackId)
      const url = blobUrls.get(key)
      if (url) {
        URL.revokeObjectURL(url)
        blobUrls.delete(key)
      }
    },

    async removeTrack(trackId) {
      const key = String(trackId)
      this.revokeBlobUrl(trackId)
      await offlineDb.deleteTrack(trackId)
      const next = { ...this.downloaded }
      delete next[key]
      this.downloaded = next
      const nextProgress = { ...this.progress }
      delete nextProgress[key]
      this.progress = nextProgress
      this.totalBytes = Object.values(this.downloaded).reduce(
        (s, row) => s + (row.sizeBytes || 0),
        0,
      )
    },

    /**
     * @param {object[]} tracks
     */
    async removePlaylistDownloads(tracks) {
      const list = Array.isArray(tracks) ? tracks : []
      for (const t of list) {
        if (this.downloaded[String(t.id)]) {
          await this.removeTrack(t.id)
        }
      }
    },

    async removeAll() {
      for (const key of blobUrls.keys()) {
        this.revokeBlobUrl(key)
      }
      await offlineDb.clearAll()
      this.downloaded = {}
      this.progress = {}
      this.totalBytes = 0
      this.playlistJob = null
    },

    /**
     * Estimate about-bytes for a playlist (downloadable + already cached).
     * @param {object[]} tracks
     */
    estimatePlaylistBytes(tracks) {
      const list = Array.isArray(tracks) ? tracks : []
      let bytes = 0
      for (const t of list) {
        if (!isTrackDownloadable(t)) continue
        const cached = this.downloaded[String(t.id)]
        bytes += cached?.sizeBytes || t.size || 0
      }
      return bytes
    },
  },
})
