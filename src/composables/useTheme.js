import { computed, ref } from 'vue'

const STORAGE_KEY = 'maxtune-theme'
/** @type {'dark'|'light'|'system'} */
const theme = ref(loadTheme())
let mql = null
let mqlHandler = null

function loadTheme() {
  if (typeof window === 'undefined') return 'dark'
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === 'dark' || raw === 'light' || raw === 'system') return raw
  return 'dark'
}

function resolveTheme(mode) {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
    return 'dark'
  }
  return mode
}

function applyDom(mode) {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(mode)
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.style.colorScheme = resolved
}

function bindSystemListener(mode) {
  if (typeof window === 'undefined') return
  if (mql && mqlHandler) {
    mql.removeEventListener('change', mqlHandler)
    mql = null
    mqlHandler = null
  }
  if (mode !== 'system') return
  mql = window.matchMedia('(prefers-color-scheme: light)')
  mqlHandler = () => applyDom('system')
  mql.addEventListener('change', mqlHandler)
}

/**
 * Theme preference: dark (default) | light | system. Persisted in localStorage only.
 */
export function useTheme() {
  const resolved = computed(() => resolveTheme(theme.value))

  function setTheme(mode) {
    if (mode !== 'dark' && mode !== 'light' && mode !== 'system') return
    theme.value = mode
    localStorage.setItem(STORAGE_KEY, mode)
    applyDom(mode)
    bindSystemListener(mode)
  }

  function initTheme() {
    applyDom(theme.value)
    bindSystemListener(theme.value)
  }

  return {
    theme,
    resolved,
    setTheme,
    initTheme,
  }
}

// Eager apply so first paint matches stored preference (index.html also bootstraps).
if (typeof window !== 'undefined') {
  applyDom(theme.value)
  bindSystemListener(theme.value)
}
