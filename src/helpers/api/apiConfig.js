/**
 * Named backend URLs per APP_MODE — same idea as greyon / ibpf-framework apiConfig.
 * Switch hosts with VITE_APP_MODE=local|staging|production in `.env`
 * Optional VITE_ENGINE_URL overrides ENGINE_URL for one-off pointing.
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
    ENGINE_URL: 'https://engine.maxtune.app/api',
    ENGINE_PUBLIC_URL: 'https://engine.maxtune.app',
  },
  staging: {
    ENGINE_URL: 'https://staging-api.maxtune.app/api',
    ENGINE_PUBLIC_URL: 'https://staging-api.maxtune.app',
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
