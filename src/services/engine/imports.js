import { engineAPI } from '@/helpers/api'

/**
 * @param {'active' | 'failed' | 'all'} [status]
 */
export async function listImports(status = 'all') {
  const res = await engineAPI.get(`/imports?status=${status}`)
  return res?.data ?? []
}

/**
 * Queue a YouTube import. The engine rebuilds the URL from the video ID.
 * @param {string} url raw trimmed link
 */
export async function submitYoutubeImport(url) {
  const res = await engineAPI.post('/imports/youtube', { url })
  return res?.data ?? res
}

/**
 * @param {number|string} id
 */
export async function retryImport(id) {
  const res = await engineAPI.post(`/imports/${id}/retry`)
  return res?.data ?? res
}

/**
 * @param {number|string} id
 */
export async function dismissImport(id) {
  return engineAPI.delete(`/imports/${id}`)
}
