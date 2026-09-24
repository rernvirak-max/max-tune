import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Notify } from 'quasar'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { endpoints } from '@/helpers/api'

const browserOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const engineReachable = ref(true)
const checking = ref(false)

let listenersBound = false
let pingTimer = null
let wasOffline = false

async function pingEngine() {
  if (typeof window === 'undefined') return
  if (!navigator.onLine) {
    engineReachable.value = false
    return
  }
  checking.value = true
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    // Lightweight unauthenticated health-ish probe via CORS-safe same-origin proxy.
    // Sanctum /me would 401 when logged out mid-session; prefer OPTIONS/HEAD on API root.
    const url = `${endpoints.ENGINE_URL.replace(/\/$/, '')}/me`
    const token = localStorage.getItem('max_tune_token')
    const headers = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'same-origin',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    // 401 still means engine is reachable
    engineReachable.value = res.status > 0 && res.status < 500
  } catch {
    engineReachable.value = false
  } finally {
    checking.value = false
  }
}

function onOnline() {
  browserOnline.value = true
  pingEngine().then(() => {
    if (wasOffline && browserOnline.value && engineReachable.value) {
      Notify.create({
        type: 'positive',
        message: OFFLINE_COPY.toast.backOnline,
        position: 'top',
        timeout: 2500,
      })
      wasOffline = false
    }
  })
}

function onOffline() {
  browserOnline.value = false
  engineReachable.value = false
  wasOffline = true
}

function ensureListeners() {
  if (listenersBound || typeof window === 'undefined') return
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  listenersBound = true
  pingEngine()
  pingTimer = setInterval(() => {
    if (navigator.onLine) pingEngine()
  }, 30000)
}

function teardownListeners() {
  // Shared singleton — listeners stay for app lifetime.
  // Exposed for tests / HMR cleanup.
  if (pingTimer) {
    clearInterval(pingTimer)
    pingTimer = null
  }
}

/**
 * Connectivity: browser online + light engine ping.
 * Offline for UX = browser offline OR engine unreachable.
 */

/** True when browser offline OR engine unreachable (for player / guards). */
export function isAppOffline() {
  return !browserOnline.value || !engineReachable.value
}

export function useConnectivity() {
  onMounted(() => {
    ensureListeners()
  })

  onUnmounted(() => {
    teardownListeners()
  })

  // Eager bind once imported from layout
  ensureListeners()

  const isBrowserOffline = computed(() => !browserOnline.value)
  const isEngineDown = computed(() => browserOnline.value && !engineReachable.value)
  const isOffline = computed(() => !browserOnline.value || !engineReachable.value)

  const bannerMessage = computed(() => {
    if (!browserOnline.value) return OFFLINE_COPY.banner.browserOffline
    if (!engineReachable.value) return OFFLINE_COPY.banner.engineDown
    return null
  })

  function requireOnline(notify = true) {
    if (!isOffline.value) return true
    if (notify) {
      Notify.create({
        type: 'warning',
        message: OFFLINE_COPY.err.mutation,
        caption: 'Uploads and edits need a connection.',
        position: 'top',
        timeout: 2800,
      })
    }
    return false
  }

  return {
    browserOnline,
    engineReachable,
    checking,
    isBrowserOffline,
    isEngineDown,
    isOffline,
    bannerMessage,
    requireOnline,
    pingEngine,
  }
}
