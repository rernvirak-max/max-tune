import { engineAPI } from '@/helpers/api'

/**
 * @param {{ q: string, limit?: number, offset?: number }} params
 */
export async function searchJamendo(params) {
  const query = new URLSearchParams()
  query.set('q', params.q)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))
  return engineAPI.get(`/catalog/jamendo?${query}`)
}

/**
 * @param {string} externalId
 */
export async function importJamendoTrack(externalId) {
  const res = await engineAPI.post('/catalog/jamendo/import', {
    external_id: externalId,
  })
  return res?.data ?? res
}
