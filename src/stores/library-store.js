import { defineStore } from 'pinia'
import { deleteTrack, listTracks, uploadTrack } from '@/services/engine/tracks'

export const useLibraryStore = defineStore('library', {
  state: () => ({
    tracks: [],
    meta: null,
    loading: false,
    uploading: false,
    uploadProgress: [],
    error: null,
    query: '',
  }),

  getters: {
    isEmpty: (state) => !state.loading && state.tracks.length === 0,
    trackCount: (state) => state.tracks.length,
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
