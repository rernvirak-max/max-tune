<template>
  <q-page class="mt-page page">
    <header class="head">
      <h1 class="mt-display">Settings</h1>
      <p class="sub">Account & storage</p>
    </header>

    <div class="panel">
      <div v-for="row in rows" :key="row.label" class="row-item">
        <div class="label">{{ row.label }}</div>
        <div class="value">{{ row.value }}</div>
      </div>
    </div>

    <q-btn class="signout" outline no-caps icon="logout" label="Sign out" @click="onLogout" />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const router = useRouter()

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const rows = computed(() => [
  { label: 'Name', value: auth.user?.name || '—' },
  { label: 'Email', value: auth.user?.email || '—' },
  { label: 'Role', value: auth.user?.role || '—' },
  { label: 'App mode', value: auth.app?.mode || '—' },
  { label: 'Storage used', value: formatBytes(auth.user?.storage_used_bytes || 0) },
])

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

.value {
  font-weight: 600;
  text-align: right;
}

.signout {
  margin-top: 24px;
  color: #ff8f8f !important;
  border-color: rgba(255, 143, 143, 0.35) !important;
  border-radius: 999px;
  padding: 0 18px;
}
</style>
