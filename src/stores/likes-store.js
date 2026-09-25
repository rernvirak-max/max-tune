import { defineStore } from 'pinia'
import { ERROR_COPY } from '@/constants/error-copy'
import { toUserMessage } from '@/helpers/userError'
import { likeTrack, listLikedTracks, unlikeTrack } from '@/services/engine/likes'
import { useLibraryStore } from '@/stores/library-store'
import { usePlayerStore } from '@/stores/player-store'
import { usePlaylistStore } from '@/stores/playlist-store'

export const useLikesStore = defineStore('likes', {
  state: () => ({
    tracks: [],
    loading: false,
    error: null,
  }),

  getters: {
    isEmpty: (state) => !state.loading && state.tracks.length === 0,
    count: (state) => state.tracks.length,
  },

  actions: {
    async fetchLiked() {
      this.loading = true
      this.error = null
      try {
        const data = await listLikedTracks({ per_page: 100 })
        this.tracks = data.data || []
      } catch (err) {
        this.error = toUserMessage(err, ERROR_COPY.load.liked, {
          context: 'liked load',
          allowServerMessage: false,
        })
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * @param {object} track
     */
    async toggle(track) {
      if (!track?.id) return null

      const next = !track.liked
      const updated = next ? await likeTrack(track.id) : await unlikeTrack(track.id)
      this.syncLiked(updated.id, Boolean(updated.liked), updated)

      return updated
    },

    /**
     * Propagate liked flag across library / player / playlist / likes list.
     * @param {number|string} trackId
     * @param {boolean} liked
     * @param {object} [trackPayload]
     */
    syncLiked(trackId, liked, trackPayload) {
      const patch = (t) => (t.id === trackId ? { ...t, ...trackPayload, liked } : t)

      const library = useLibraryStore()
      library.tracks = library.tracks.map(patch)

      const player = usePlayerStore()
      if (player.currentTrack?.id === trackId) {
        player.currentTrack = { ...player.currentTrack, ...trackPayload, liked }
      }
      player.queue = player.queue.map(patch)

      const playlists = usePlaylistStore()
      if (playlists.current?.tracks) {
        playlists.current = {
          ...playlists.current,
          tracks: playlists.current.tracks.map(patch),
        }
      }

      if (liked && trackPayload) {
        const exists = this.tracks.some((t) => t.id === trackId)
        if (!exists) {
          this.tracks.unshift({ ...trackPayload, liked: true })
        } else {
          this.tracks = this.tracks.map(patch)
        }
      } else {
        this.tracks = this.tracks.filter((t) => t.id !== trackId)
      }
    },
  },
})
