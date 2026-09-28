import { engineAPI } from '@/helpers/api'

export async function listYoutubeImports() {
  return engineAPI.get('/imports/youtube')
}

/**
 * @param {string} url
 */
export async function createYoutubeImport(url) {
  const res = await engineAPI.post('/imports/youtube', { url })
  return res?.data ?? res
}

/**
 * @param {number|string} id
 */
export async function cancelYoutubeImport(id) {
  return engineAPI.delete(`/imports/youtube/${id}`)
}

/**
 * @param {string} text
 */
export function extractYoutubeUrl(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const match = raw.match(
    /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)[^\s]+/i,
  )
  if (match) return match[0].replace(/[),.;]+$/, '')
  if (/^(?:youtu\.be\/|youtube\.com\/)/i.test(raw)) {
    return `https://${raw.replace(/^\/+/, '')}`
  }
  return null
}
