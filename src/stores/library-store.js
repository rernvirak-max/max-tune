import { defineStore } from 'pinia'
import { ERROR_COPY } from '@/constants/error-copy'
import { toUserMessage } from '@/helpers/userError'
import { deleteTrack, listTracks, uploadTrack } from '@/services/engine/tracks'

/** Files uploaded at once; overlaps transfer latency without flooding the engine */
const UPLOAD_CONCURRENCY = 3
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

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
        this.error = toUserMessage(err, ERROR_COPY.load.library, {
          context: 'library load',
          allowServerMessage: false,
        })
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * @param {FileList|File[]} files
     */
    async uploadFiles(files) {
      const queue = Array.from(files || [])
      if (!queue.length) return []

      this.uploading = true
      this.error = null
      const created = []

      const worker = async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          const track = await this.uploadFile(file)
          if (track) created.push(track)
        }
      }
      const workerCount = Math.min(UPLOAD_CONCURRENCY, queue.length)
      await Promise.all(Array.from({ length: workerCount }, worker))

      this.uploading = false
      return created
    },

    /**
     * Upload one file, tracking its progress row. Resolves to the track, or null on failure.
     * @param {File} file
     */
    async uploadFile(file) {
      this.uploadProgress.unshift({ name: file.name, status: 'uploading', error: null, pct: 0 })
      // Reactive row (not the raw object) so progress re-renders while uploads overlap
      const item = this.uploadProgress[0]
      try {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw Object.assign(new Error('File exceeds 50 MB limit'), {
            userMessage: 'File exceeds 50 MB limit',
          })
        }
        const track = await uploadTrack(file, {
          onProgress: (pct) => {
            item.pct = pct
          },
        })
        item.status = 'done'
        item.pct = 100
        this.tracks.unshift(track)
        return track
      } catch (err) {
        item.status = 'error'
        item.error = toUserMessage(err, ERROR_COPY.action.upload, {
          context: 'upload',
          network: ERROR_COPY.action.uploadNetwork,
        })
        this.error = item.error
        return null
      }
    },

    /** Show a track created elsewhere (e.g. a finished YouTube import) at the top. */
    prependTrack(track) {
      if (!this.tracks.some((t) => t.id === track.id)) this.tracks.unshift(track)
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
