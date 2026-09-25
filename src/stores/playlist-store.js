import { defineStore } from 'pinia'
import { ERROR_COPY } from '@/constants/error-copy'
import { toUserMessage } from '@/helpers/userError'
import {
  attachTrack,
  createPlaylist,
  deletePlaylist,
  detachTrack,
  getPlaylist,
  listPlaylists,
  updatePlaylist,
} from '@/services/engine/playlists'

export const usePlaylistStore = defineStore('playlists', {
  state: () => ({
    playlists: [],
    current: null,
    loading: false,
    detailLoading: false,
    error: null,
  }),

  getters: {
    isEmpty: (state) => !state.loading && state.playlists.length === 0,
    count: (state) => state.playlists.length,
  },

  actions: {
    async fetchPlaylists() {
      this.loading = true
      this.error = null
      try {
        const data = await listPlaylists()
        this.playlists = data.data || []
      } catch (err) {
        this.error = toUserMessage(err, ERROR_COPY.load.playlists, {
          context: 'playlists load',
          allowServerMessage: false,
        })
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchPlaylist(id) {
      this.detailLoading = true
      this.error = null
      try {
        this.current = await getPlaylist(id)
        return this.current
      } catch (err) {
        // 404: page shows "Playlist not found" instead of an error
        this.error =
          err?.status === 404
            ? null
            : toUserMessage(err, ERROR_COPY.load.playlist, {
                context: 'playlist load',
                allowServerMessage: false,
              })
        this.current = null
        throw err
      } finally {
        this.detailLoading = false
      }
    },

    /**
     * @param {{ title: string, description?: string }} payload
     */
    async create(payload) {
      const playlist = await createPlaylist(payload)
      this.playlists.unshift(playlist)
      return playlist
    },

    /**
     * @param {number|string} id
     * @param {{ title?: string, description?: string }} payload
     */
    async update(id, payload) {
      const playlist = await updatePlaylist(id, payload)
      this.playlists = this.playlists.map((p) => (p.id === playlist.id ? { ...p, ...playlist } : p))
      if (this.current?.id === playlist.id) {
        this.current = { ...this.current, ...playlist }
      }
      return playlist
    },

    async remove(id) {
      await deletePlaylist(id)
      this.playlists = this.playlists.filter((p) => p.id !== id)
      if (this.current?.id === id) this.current = null
    },

    /**
     * @param {number|string} playlistId
     * @param {number|string} trackId
     */
    async addTrack(playlistId, trackId) {
      const playlist = await attachTrack(playlistId, trackId)
      this.playlists = this.playlists.map((p) =>
        p.id === playlist.id
          ? { ...p, track_count: playlist.track_count, cover_url: playlist.cover_url }
          : p,
      )
      if (this.current?.id === playlist.id) {
        this.current = playlist
      }
      return playlist
    },

    /**
     * @param {number|string} playlistId
     * @param {number|string} trackId
     */
    async removeTrack(playlistId, trackId) {
      const playlist = await detachTrack(playlistId, trackId)
      this.playlists = this.playlists.map((p) =>
        p.id === playlist.id
          ? { ...p, track_count: playlist.track_count, cover_url: playlist.cover_url }
          : p,
      )
      if (this.current?.id === playlist.id) {
        this.current = playlist
      }
      return playlist
    },
  },
})
