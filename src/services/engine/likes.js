import { engineAPI } from '@/helpers/api'

/**
 * @param {{ per_page?: number, page?: number }} [params]
 */
export async function listLikedTracks(params = {}) {
  const query = new URLSearchParams()
  if (params.per_page) query.set('per_page', String(params.per_page))
  if (params.page) query.set('page', String(params.page))
  const suffix = query.toString() ? `?${query}` : ''
  return engineAPI.get(`/likes${suffix}`)
}

/**
 * @param {number|string} trackId
 */
export async function likeTrack(trackId) {
  const res = await engineAPI.post(`/tracks/${trackId}/like`)
  return res?.data ?? res
}

/**
 * @param {number|string} trackId
 */
export async function unlikeTrack(trackId) {
  const res = await engineAPI.delete(`/tracks/${trackId}/like`)
  return res?.data ?? res
}
