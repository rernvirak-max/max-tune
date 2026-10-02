/**
 * Build absolute, shareable links into the SPA.
 *
 * MaxTune ships with vue-router in **hash** mode (quasar.config.js → vueRouterMode),
 * so a link to `/register?code=X` would hit the static host's index.html and the
 * router would ignore it. The correct production link is
 * `https://maxtune.ictskills.center/#/register?code=X`. In `history` mode the same
 * helper yields `${origin}${base}register?code=X`.
 *
 * Pure (no window / router access) so it can be unit-tested with node:test.
 */

/**
 * @param {string} base Router base (QUASAR_VUE_ROUTER_BASE), e.g. "/" or "/app/"
 * @returns {string} "" for root, otherwise "/app" (leading slash, no trailing slash)
 */
function normalizeBase(base) {
  const trimmed = String(base ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}` : ''
}

/**
 * @param {Record<string, string | null | undefined>} [query]
 * @returns {string} "" or "?a=b&c=d" (values percent-encoded, empty values skipped)
 */
function toQueryString(query = {}) {
  const parts = Object.entries(query)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v).trim())}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

/**
 * @param {Object} opts
 * @param {string} opts.origin e.g. "https://maxtune.ictskills.center" (trailing slash tolerated)
 * @param {string} opts.path   route path, e.g. "/register"
 * @param {Record<string, string | null | undefined>} [opts.query]
 * @param {'hash' | 'history'} [opts.mode] router mode (default "hash", MaxTune's mode)
 * @param {string} [opts.base] router base (default "/")
 * @returns {string}
 */
export function buildAppUrl({ origin, path, query, mode = 'hash', base = '/' }) {
  const root = String(origin ?? '')
    .trim()
    .replace(/\/+$/, '')
  const route = `/${String(path ?? '').replace(/^\/+/, '')}${toQueryString(query)}`
  const prefix = normalizeBase(base)
  return mode === 'history' ? `${root}${prefix}${route}` : `${root}${prefix}/#${route}`
}

/**
 * Invite share link: `${origin}/#/register?code=CODE` (hash mode).
 * Returns "" when there is no code.
 *
 * @param {Object} opts
 * @param {string} opts.origin
 * @param {string} opts.code
 * @param {'hash' | 'history'} [opts.mode]
 * @param {string} [opts.base]
 * @returns {string}
 */
export function buildInviteLink({ origin, code, mode, base }) {
  const clean = String(code ?? '').trim()
  if (!clean) return ''
  return buildAppUrl({ origin, path: '/register', query: { code: clean }, mode, base })
}

/**
 * Sign-in link (shown on the "user created" credentials card).
 *
 * @param {Object} opts
 * @param {string} opts.origin
 * @param {'hash' | 'history'} [opts.mode]
 * @param {string} [opts.base]
 * @returns {string}
 */
export function buildLoginLink({ origin, mode, base }) {
  return buildAppUrl({ origin, path: '/login', mode, base })
}

/**
 * Router mode / base the running bundle was built with.
 * @returns {{ mode: 'hash' | 'history', base: string }}
 */
export function getRouterLinkConfig() {
  return {
    mode: import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history' ? 'history' : 'hash',
    base: import.meta.env.QUASAR_VUE_ROUTER_BASE || '/',
  }
}
