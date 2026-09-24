<template>
  <q-page class="mt-page page">
    <header class="head">
      <h1 class="mt-display">Settings</h1>
      <p class="sub">Account, appearance & playback</p>
    </header>

    <section class="section">
      <h2 class="section-title">Account</h2>
      <div class="panel">
        <div v-for="row in rows" :key="row.label" class="row-item">
          <div class="label">{{ row.label }}</div>
          <div class="value">{{ row.value }}</div>
        </div>
      </div>
      <q-btn class="signout" outline no-caps icon="logout" label="Sign out" @click="onLogout" />
    </section>

    <section class="section">
      <h2 class="section-title">Appearance</h2>
      <div class="panel theme-panel">
        <div class="label">Theme</div>
        <div class="theme-row row q-gutter-sm">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            type="button"
            class="theme-chip"
            :class="{ on: theme === opt.value }"
            @click="setTheme(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <p class="hint">Dark is the Pulse Room default. Choice stays on this device only.</p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Offline downloads</h2>
      <div class="panel offline-panel">
        <div class="toggle-row row items-center justify-between">
          <div>
            <div class="label-strong" id="wifi-only-label">{{ copy.settings.wifiOnly }}</div>
            <p class="hint tight">{{ copy.settings.wifiOnlyHint }}</p>
          </div>
          <q-toggle
            :model-value="offline.wifiOnly"
            color="primary"
            aria-labelledby="wifi-only-label"
            @update:model-value="offline.setWifiOnly"
          />
        </div>
        <p class="hint detect">
          Cellular detection uses the Network Information API when available; some browsers cannot
          tell Wi-Fi from cell, so the toggle may not block every mobile network.
        </p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Offline storage</h2>
      <div class="panel offline-panel">
        <div class="usage">
          <div class="label-strong">{{ copy.settings.storageUsed(usedLabel) }}</div>
          <p class="hint tight">{{ copy.settings.storageSub }}</p>
        </div>
        <div class="row q-gutter-sm q-mt-md">
          <q-btn
            flat
            no-caps
            dense
            icon="library_music"
            :label="copy.settings.manage"
            class="manage"
            :to="{ name: 'library', query: { offline: '1' } }"
          />
        </div>
        <q-btn
          class="remove-all"
          outline
          no-caps
          icon="delete_outline"
          :label="copy.settings.removeAll"
          :disable="!offline.downloadedCount"
          @click="onRemoveAll"
        />
        <p class="hint ios">{{ copy.settings.iosNote }}</p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Playback</h2>
      <div class="panel playback-panel">
        <p>
          MaxTune can keep playing when the screen locks on supported browsers - artwork and
          controls follow the OS lock screen / media notification.
        </p>
        <ul>
          <li>
            <strong>Android Chrome</strong> (tab or installed PWA) and
            <strong>desktop Chromium</strong>: expected to continue in background with Media Session
            controls.
          </li>
          <li>
            <strong>iOS Safari / PWA</strong>: best-effort only. Background audio needs a proper
            audio element plus a user gesture to start; lock-screen artwork support varies by iOS
            version. Do not expect parity with Android Chrome.
          </li>
        </ul>
        <p class="hint">
          MaxTune never pauses just because the tab is hidden or the window blurs - only an explicit
          pause (in-app or OS) stops playback.
        </p>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { useAuthStore } from '@/stores/auth-store'
import { formatStorageBytes, useOfflineStore } from '@/stores/offline-store'
import { useTheme } from '@/composables/useTheme'

const $q = useQuasar()
const auth = useAuthStore()
const offline = useOfflineStore()
const router = useRouter()
const { theme, setTheme } = useTheme()
const copy = OFFLINE_COPY

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
]

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const usedLabel = computed(() => formatStorageBytes(offline.totalBytes))

const rows = computed(() => [
  { label: 'Name', value: auth.user?.name || '-' },
  { label: 'Email', value: auth.user?.email || '-' },
  { label: 'Role', value: auth.user?.role || '-' },
  { label: 'App mode', value: auth.app?.mode || '-' },
  { label: 'Storage used', value: formatBytes(auth.user?.storage_used_bytes || 0) },
])

onMounted(() => {
  offline.hydrate().catch(() => {})
})

function onRemoveAll() {
  $q.dialog({
    title: copy.settings.removeAllTitle,
    message: copy.settings.removeAllBody,
    cancel: { label: 'Cancel', flat: true },
    persistent: true,
    dark: true,
    ok: { label: copy.settings.removeAll, color: 'negative', flat: false },
  }).onOk(async () => {
    await offline.removeAll()
    $q.notify({ type: 'positive', message: 'Downloads removed', position: 'top' })
  })
}

async function onLogout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<style scoped>
.page {
  padding: 36px 36px 48px;
  max-width: 640px;
}

@media (max-width: 599px) {
  .page {
    padding: 24px 18px 40px;
  }
}

.head {
  margin-bottom: 28px;
}

h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
}

.sub {
  margin: 8px 0 0;
  color: var(--mt-text-muted);
}

.section {
  margin-bottom: 28px;
}

.section-title {
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}

.panel {
  border: 1px solid var(--mt-border);
  border-radius: 16px;
  background: var(--mt-bg-panel);
  overflow: hidden;
}

.row-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--mt-border);
}

.row-item:last-child {
  border-bottom: 0;
}

.label {
  color: var(--mt-text-muted);
  font-size: 0.9rem;
}

.label-strong {
  font-weight: 600;
  font-size: 0.95rem;
}

.value {
  font-weight: 600;
  text-align: right;
}

.theme-panel,
.playback-panel,
.offline-panel {
  padding: 16px 18px 18px;
}

.theme-row {
  margin-top: 10px;
  flex-wrap: wrap;
}

.theme-chip {
  border: 1px solid var(--mt-border);
  background: transparent;
  color: var(--mt-text-muted);
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition:
    background 160ms var(--ease-out),
    color 160ms var(--ease-out),
    border-color 160ms var(--ease-out);
}

.theme-chip:hover {
  color: var(--mt-text);
  background: var(--mt-bg-panel-hover);
}

.theme-chip.on {
  color: var(--mt-bg);
  background: var(--mt-accent);
  border-color: transparent;
}

.theme-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--mt-accent-soft);
}

.playback-panel p,
.playback-panel li {
  margin: 0;
  color: var(--mt-text-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

.playback-panel ul {
  margin: 12px 0;
  padding-left: 1.2em;
}

.playback-panel li + li {
  margin-top: 8px;
}

.playback-panel strong {
  color: var(--mt-text);
  font-weight: 600;
}

.hint {
  margin: 12px 0 0;
  color: var(--mt-text-dim);
  font-size: 0.8rem;
  line-height: 1.45;
}

.hint.tight {
  margin-top: 4px;
}

.hint.detect {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--mt-border);
}

.hint.ios {
  margin-top: 16px;
}

.toggle-row {
  gap: 16px;
}

.manage {
  color: var(--mt-accent) !important;
}

.remove-all {
  margin-top: 14px;
  color: #ff8f8f !important;
  border-color: rgba(255, 143, 143, 0.35) !important;
  border-radius: 999px;
  padding: 0 18px;
}

.signout {
  margin-top: 16px;
  color: #ff8f8f !important;
  border-color: rgba(255, 143, 143, 0.35) !important;
  border-radius: 999px;
  padding: 0 18px;
}
</style>
