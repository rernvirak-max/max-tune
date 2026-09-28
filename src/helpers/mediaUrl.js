import { getApiEndpoints } from '@/helpers/api/apiConfig'

/**
 * Local dev only: turn an absolute engine media URL into the same-origin
 * /engine Vite proxy path so <audio> / <img> work from the Quasar dev server.
 * In staging/production (ENGINE_URL is absolute) the engine URL is used as-is;
 * the SPA host has no /engine proxy (its nginx would 404).
 *
 * @param {string|null|undefined} absoluteUrl
 * @returns {string|null}
 */
export function toEngineProxyUrl(absoluteUrl) {
  if (!absoluteUrl) return null

  const usesDevProxy = getApiEndpoints().ENGINE_URL.startsWith('/')

  try {
    const url = new URL(absoluteUrl, window.location.origin)
    if (usesDevProxy && url.pathname.startsWith('/api/')) {
      return `/engine${url.pathname}${url.search}`
    }
    // Never hand an http:// media URL to an https page (mixed content)
    if (window.location.protocol === 'https:' && url.protocol === 'http:') {
      url.protocol = 'https:'
      return url.toString()
    }
    return absoluteUrl
  } catch {
    return absoluteUrl
  }
}

/**
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return '—:—'
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}
