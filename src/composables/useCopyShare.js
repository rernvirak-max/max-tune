import { copyToClipboard, Notify } from 'quasar'
import { ERROR_COPY } from '@/constants/error-copy'

/**
 * Copy / native-share helpers for admin pages.
 * Quasar's copyToClipboard falls back to execCommand where navigator.clipboard is unavailable
 * (plain http, older webviews), so a failure here is rare and gets friendly copy.
 */
export function useCopyShare() {
  /**
   * @param {string} text
   * @param {string} [message] toast on success
   * @returns {Promise<boolean>}
   */
  async function copyText(text, message = 'Copied') {
    try {
      await copyToClipboard(text)
      Notify.create({ message, color: 'dark', timeout: 1800 })
      return true
    } catch (err) {
      console.warn('[maxtune] copy failed', err)
      Notify.create({ message: ERROR_COPY.action.copy, color: 'negative' })
      return false
    }
  }

  /** True when the browser offers the Web Share sheet (mostly phones / PWA). */
  function canNativeShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  }

  /**
   * Open the native share sheet when available, otherwise copy the URL.
   * Dismissing the sheet is not an error. Any other share failure falls back to copy.
   * @param {{ title?: string, text?: string, url: string }} data
   * @returns {Promise<'shared' | 'copied' | 'cancelled' | 'failed'>}
   */
  async function shareOrCopy({ title, text, url }) {
    if (canNativeShare()) {
      try {
        await navigator.share({ title, text, url })
        return 'shared'
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelled'
        console.warn('[maxtune] share failed, copying instead', err)
      }
    }
    return (await copyText(url, 'Link copied')) ? 'copied' : 'failed'
  }

  return { copyText, shareOrCopy, canNativeShare }
}
