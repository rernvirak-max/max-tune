/**
 * Turn an absolute engine URL into a same-origin /engine proxy URL
 * so <audio> / <img> work from the Quasar dev server.
 *
 * @param {string|null|undefined} absoluteUrl
 * @returns {string|null}
 */
export function toEngineProxyUrl(absoluteUrl) {
  if (!absoluteUrl) return null

  try {
    const url = new URL(absoluteUrl, window.location.origin)
    if (url.pathname.startsWith('/api/')) {
      return `/engine${url.pathname}${url.search}`
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
