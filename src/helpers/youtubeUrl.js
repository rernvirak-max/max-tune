/**
 * Client-side mirror of the engine's YoutubeUrl parser (Design handoff §3).
 * The engine stays the authority; this only drives live validation copy.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const WATCH_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']
const SHORT_HOSTS = ['youtu.be', 'www.youtu.be']

/**
 * @typedef {Object} YoutubeUrlResult
 * @property {'empty' | 'valid' | 'invalid' | 'playlist'} status
 * @property {string} [videoId]
 * @property {boolean} [isShort] youtube.com/shorts/ID
 * @property {boolean} [listIgnored] watch URL that also carried `list=`
 */

/**
 * @param {string} input raw pasted text (trimmed here)
 * @returns {YoutubeUrlResult}
 */
export function parseYoutubeUrl(input) {
  const raw = String(input || '').trim()
  if (!raw) return { status: 'empty' }

  let url
  try {
    url = new URL(HAS_SCHEME.test(raw) ? raw : `https://${raw}`)
  } catch {
    return { status: 'invalid' }
  }

  if (!['http:', 'https:'].includes(url.protocol)) return { status: 'invalid' }

  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter(Boolean)
  let candidate = null
  let isShort = false

  if (SHORT_HOSTS.includes(host)) {
    candidate = segments[0]
  } else if (WATCH_HOSTS.includes(host)) {
    if (segments[0] === 'shorts') {
      candidate = segments[1]
      isShort = true
    } else if (segments[0] === 'watch' && url.searchParams.has('v')) {
      candidate = url.searchParams.get('v')
    } else if (['watch', 'playlist'].includes(segments[0]) && url.searchParams.has('list')) {
      return { status: 'playlist' }
    }
  }

  if (!candidate || !VIDEO_ID.test(candidate)) return { status: 'invalid' }

  return {
    status: 'valid',
    videoId: candidate,
    isShort,
    listIgnored: url.searchParams.has('list'),
  }
}
