/**
 * Pure helpers for the admin "Create user" flow (no Vue / Quasar imports → node:test friendly).
 */

export const MIN_PASSWORD_LENGTH = 8
const BYTES_PER_GB = 1024 ** 3
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Server field order when picking the one error to surface. */
const FIELD_ORDER = ['name', 'email', 'password', 'quota_bytes']

/**
 * GB (number or numeric string) → whole bytes. Blank / null → null (= engine default quota).
 * @param {unknown} gb
 * @returns {number | null}
 */
export function gbToBytes(gb) {
  if (gb === null || gb === undefined || String(gb).trim() === '') return null
  const n = Number(gb)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * BYTES_PER_GB)
}

/**
 * @typedef {Object} CreateUserForm
 * @property {string} name
 * @property {string} email
 * @property {boolean} generate  true → engine generates a temporary password
 * @property {string} password
 * @property {string | number | null} quotaGb
 */

/**
 * Client-side checks mirroring the engine rules. Returns `{ field: message }` (empty = valid).
 * @param {CreateUserForm} form
 * @returns {Record<string, string>}
 */
export function validateCreateUser(form) {
  /** @type {Record<string, string>} */
  const errors = {}
  if (!String(form.name ?? '').trim()) errors.name = 'Enter a name'
  const email = String(form.email ?? '').trim()
  if (!email) errors.email = 'Enter an email address'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address'
  if (!form.generate && String(form.password ?? '').length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`
  }
  const quota = form.quotaGb
  if (quota !== null && quota !== undefined && String(quota).trim() !== '') {
    const n = Number(quota)
    if (!Number.isFinite(n) || n < 0) errors.quota = 'Enter 0 or more GB'
  }
  return errors
}

/**
 * Body for POST /admin/users. `password` is only sent when the admin typed one;
 * `quota_bytes` only when a quota was entered. `is_admin` is never sent.
 * @param {CreateUserForm} form
 */
export function buildCreateUserPayload(form) {
  /** @type {Record<string, unknown>} */
  const payload = { name: String(form.name).trim(), email: String(form.email).trim() }
  if (!form.generate && String(form.password ?? '') !== '') payload.password = form.password
  const bytes = gbToBytes(form.quotaGb)
  if (bytes !== null) payload.quota_bytes = bytes
  return payload
}

/**
 * Engine validation errors (422 `errors`) → `{ field: firstMessage }`, quota_bytes mapped to `quota`.
 * Anything that is not a 422 validation body returns `{}`.
 * @param {unknown} err ApiError-like
 * @returns {Record<string, string>}
 */
export function fieldErrorsFromApiError(err) {
  const e = /** @type {any} */ (err)
  const errors = e?.status === 422 ? e?.body?.errors : null
  if (!errors || typeof errors !== 'object') return {}
  /** @type {Record<string, string>} */
  const out = {}
  const keys = [...FIELD_ORDER, ...Object.keys(errors).filter((k) => !FIELD_ORDER.includes(k))]
  for (const key of keys) {
    const first = Array.isArray(errors[key]) ? errors[key][0] : null
    if (typeof first === 'string' && first.trim())
      out[key === 'quota_bytes' ? 'quota' : key] = first
  }
  return out
}

/**
 * Plain-text block the admin pastes into a chat to the new user.
 * @param {{ email: string, password: string, loginUrl?: string, temporary?: boolean }} c
 * @returns {string}
 */
export function formatCredentials({ email, password, loginUrl = '', temporary = false }) {
  const lines = [
    'MaxTune sign-in',
    `Email: ${email}`,
    `${temporary ? 'Temporary password' : 'Password'}: ${password}`,
  ]
  if (loginUrl) lines.push(`Sign in: ${loginUrl}`)
  return lines.join('\n')
}
