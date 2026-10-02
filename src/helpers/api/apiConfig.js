/**
 * Named backend URLs per APP_MODE — same idea as greyon / ibpf-framework apiConfig.
 * Switch hosts with VITE_APP_MODE=local|staging|production in `.env`
 * VITE_ENGINE_URL / VITE_ENGINE_PUBLIC_URL overrides apply in local mode only.
 */

/** @typedef {'local' | 'staging' | 'production'} ApiMode */

/**
 * @typedef {Object} ApiEndpoints
 * @property {string} ENGINE_URL - max-tune-engine JSON API root (includes /api)
 * @property {string} ENGINE_PUBLIC_URL - Absolute engine origin (Herd / prod host)
 */

/** @type {Record<ApiMode, ApiEndpoints>} */
const API_CONFIG = {
  production: {
    ENGINE_URL: 'https://maxtune-engine.mxlab.site/api',
    ENGINE_PUBLIC_URL: 'https://maxtune-engine.mxlab.site',
  },
  staging: {
    ENGINE_URL: 'https://maxtune-engine.mxlab.site/api',
    ENGINE_PUBLIC_URL: 'https://maxtune-engine.mxlab.site',
  },
  local: {
    // Vite same-origin proxy → Herd (see quasar.config.js). Avoids .test DNS/CORS issues.
    ENGINE_URL: '/engine/api',
    ENGINE_PUBLIC_URL: 'https://max-tune-engine.test',
  },
}

/** @returns {ApiMode} */
export function getApiMode() {
  const raw = String(import.meta.env.VITE_APP_MODE || 'local').toLowerCase()
  if (raw === 'production' || raw === 'staging' || raw === 'local') {
    return raw
  }
  return 'local'
}

/** @returns {ApiEndpoints} */
export function getApiEndpoints() {
  const mode = getApiMode()
  const base = API_CONFIG[mode]

  // Vite overrides are for local pointing only. Staging/production always use
  // API_CONFIG so a stale Coolify build arg (e.g. ictskills.center) cannot
  // bake a dead host into the bundle.
  if (mode !== 'local') {
    return {
      ENGINE_URL: base.ENGINE_URL,
      ENGINE_PUBLIC_URL: base.ENGINE_PUBLIC_URL,
    }
  }

  const engineOverride = import.meta.env.VITE_ENGINE_URL
  const publicOverride = import.meta.env.VITE_ENGINE_PUBLIC_URL

  return {
    ENGINE_URL: engineOverride?.trim()
      ? engineOverride.replace(/\/$/, '')
      : base.ENGINE_URL,
    ENGINE_PUBLIC_URL: publicOverride?.trim()
      ? publicOverride.replace(/\/$/, '')
      : base.ENGINE_PUBLIC_URL,
  }
}

export default API_CONFIG
