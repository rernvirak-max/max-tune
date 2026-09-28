import { defineStore } from 'pinia'
import { deleteTrack, listTracks, uploadTrack } from '@/services/engine/tracks'
import {
  cancelYoutubeImport,
  createYoutubeImport,
  extractYoutubeUrl,
  listYoutubeImports,
} from '@/services/engine/youtube'

const ACTIVE_IMPORT_STATUSES = new Set([
  'queued',
  'waiting_for_metadata',
  'downloading',
  'processing',
])

export const useLibraryStore = defineStore('library', {
  state: () => ({
    tracks: [],
    meta: null,
    loading: false,
    uploading: false,
    uploadProgress: [],
    imports: [],
    importing: false,
    error: null,
    query: '',
    _importPollTimer: null,
  }),

  getters: {
    isEmpty: (state) => !state.loading && state.tracks.length === 0,
    trackCount: (state) => state.tracks.length,
    activeImports: (state) => state.imports.filter((item) => ACTIVE_IMPORT_STATUSES.has(item.status)),
  },

  actions: {
    async fetchTracks(q) {
      this.loading = true
      this.error = null
      if (typeof q === 'string') this.query = q
      try {
        const data = await listTracks({ q: this.query || undefined, per_page: 100 })
        this.tracks = data.data || []
        this.meta = data.meta || null
      } catch (err) {
        this.error = err?.message || 'Failed to load library'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchImports() {
      try {
        const data = await listYoutubeImports()
        this.imports = data.data || []
        this.ensureImportPolling()
      } catch {
        // Keep library usable if imports endpoint is unavailable
      }
    },

    ensureImportPolling() {
      if (typeof window === 'undefined') return
      const needsPoll = this.imports.some((item) => ACTIVE_IMPORT_STATUSES.has(item.status))
      if (!needsPoll) {
        if (this._importPollTimer) {
          clearInterval(this._importPollTimer)
          this._importPollTimer = null
        }
        return
      }
      if (this._importPollTimer) return
      this._importPollTimer = setInterval(() => {
        this.pollImports()
      }, 2500)
    },

    async pollImports() {
      const before = this.imports.map((i) => `${i.id}:${i.status}`).join('|')
      await this.fetchImports()
      const after = this.imports.map((i) => `${i.id}:${i.status}`).join('|')
      const finished = this.imports.some((i) => i.status === 'done')
      if (finished && before !== after) {
        await this.fetchTracks().catch(() => {})
      }
    },

    /**
     * @param {string} text
     * @returns {Promise<object|null>}
     */
    async importYoutubeFromText(text) {
      const url = extractYoutubeUrl(text)
      if (!url) return null
      this.importing = true
      try {
        const item = await createYoutubeImport(url)
        this.imports = [item, ...this.imports.filter((i) => i.id !== item.id)]
        this.ensureImportPolling()
        return item
      } finally {
        this.importing = false
      }
    },

    async cancelImport(id) {
      await cancelYoutubeImport(id)
      this.imports = this.imports.map((item) =>
        item.id === id
          ? { ...item, status: 'cancelled', status_message: 'Cancelled' }
          : item,
      )
      this.ensureImportPolling()
    },

    /**
     * @param {FileList|File[]} files
     */
    async uploadFiles(files) {
      const list = Array.from(files || [])
      if (!list.length) return []

      this.uploading = true
      this.error = null
      const created = []

      for (const file of list) {
        const item = { name: file.name, status: 'uploading', error: null, pct: 0 }
        this.uploadProgress.unshift(item)
        try {
          if (file.size > 50 * 1024 * 1024) {
            throw new Error('File exceeds 50 MB limit')
          }
          const track = await uploadTrack(file, {
            onProgress: (pct) => {
              item.pct = pct
            },
          })
          item.status = 'done'
          item.pct = 100
          created.push(track)
          this.tracks.unshift(track)
        } catch (err) {
          item.status = 'error'
          item.error = err?.message || 'Upload failed'
          this.error = item.error
        }
      }

      this.uploading = false
      return created
    },

    async removeTrack(id) {
      await deleteTrack(id)
      this.tracks = this.tracks.filter((t) => t.id !== id)
    },

    clearProgress() {
      this.uploadProgress = []
    },
  },
})
