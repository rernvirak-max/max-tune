import { ERROR_COPY } from '@/constants/error-copy'

const NETWORK_MESSAGE =
  /failed to fetch|networkerror|network error|load failed|network request failed|timed? ?out|err_/i

/**
 * True for "could not talk to the server at all" failures: fetch TypeError
 * ("Failed to fetch" / "Load failed"), aborted requests, XHR network errors, status 0.
 * @param {unknown} err
 */
export function isNetworkError(err) {
  if (!err || typeof err !== 'object') return false
  const e = /** @type {any} */ (err)
  if (e.network === true || e.status === 0) return true
  if (e.name === 'AbortError' || e.name === 'TimeoutError') return true
  if (e instanceof TypeError) return true
  return typeof e.message === 'string' && NETWORK_MESSAGE.test(e.message)
}

/**
 * Map any thrown error to short, friendly copy for the UI. Never returns raw
 * fetch / TypeError / HTML error text. Only an explicit `userMessage` (engine 4xx JSON
 * `message`, e.g. validation) is passed through, and only when `allowServerMessage` is set.
 * The original error is logged to the console for debugging.
 *
 * @param {unknown} err
 * @param {string} [fallback]
 * @param {{ context?: string, allowServerMessage?: boolean, network?: string }} [opts]
 * @returns {string}
 */
export function toUserMessage(err, fallback = ERROR_COPY.generic, opts = {}) {
  const { context = 'request', allowServerMessage = true, network } = opts
  if (typeof console !== 'undefined') console.warn(`[maxtune] ${context} failed`, err)

  if (isNetworkError(err)) return network || fallback
  const userMessage = /** @type {any} */ (err)?.userMessage
  if (allowServerMessage && typeof userMessage === 'string' && userMessage.trim()) {
    return userMessage.trim()
  }
  return fallback
}
