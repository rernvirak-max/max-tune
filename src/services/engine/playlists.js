import { engineAPI } from '@/helpers/api'

export async function listPlaylists() {
  return engineAPI.get('/playlists')
}

/**
 * @param {{ title: string, description?: string }} payload
 */
export async function createPlaylist(payload) {
  const res = await engineAPI.post('/playlists', payload)
  return res?.data ?? res
}

/**
 * @param {number|string} id
 */
export async function getPlaylist(id) {
  const res = await engineAPI.get(`/playlists/${id}`)
  return res?.data ?? res
}

/**
 * @param {number|string} id
 * @param {{ title?: string, description?: string }} payload
 */
export async function updatePlaylist(id, payload) {
  const res = await engineAPI.patch(`/playlists/${id}`, payload)
  return res?.data ?? res
}

/**
 * @param {number|string} id
 */
export async function deletePlaylist(id) {
  return engineAPI.delete(`/playlists/${id}`)
}

/**
 * @param {number|string} playlistId
 * @param {number|string} trackId
 */
export async function attachTrack(playlistId, trackId) {
  const res = await engineAPI.post(`/playlists/${playlistId}/tracks`, {
    track_id: trackId,
  })
  return res?.data ?? res
}

/**
 * @param {number|string} playlistId
 * @param {number|string} trackId
 */
export async function detachTrack(playlistId, trackId) {
  const res = await engineAPI.delete(`/playlists/${playlistId}/tracks/${trackId}`)
  return res?.data ?? res
}
