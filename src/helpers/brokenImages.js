import { reactive } from 'vue'

/**
 * Image URLs that failed to load (offline, expired signed URL, 404…).
 * Components render their normal placeholder instead of a broken <img>.
 * Cleared when the browser comes back online so remote covers get another try.
 */
const broken = reactive(new Set())

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => broken.clear())
}

/** @param {string|null|undefined} src */
export function isBrokenImage(src) {
  return Boolean(src) && broken.has(src)
}

/** @param {string|null|undefined} src */
export function markBrokenImage(src) {
  if (src) broken.add(src)
}
