<template>
  <q-page class="admin-page">
    <header class="head">
      <h1 class="mt-display">Users</h1>
      <p class="sub">Disable accounts and override quotas</p>
    </header>
    <AdminTabs />

    <div v-if="loading" class="panel"><div class="row-item">Loading…</div></div>
    <div v-else-if="error" class="panel err">Couldn’t load users <q-btn flat label="Retry" @click="load" /></div>
    <div v-else class="panel">
      <div v-for="u in users" :key="u.id" class="row-item user-row">
        <div>
          <div>{{ u.email }}</div>
          <div class="muted">{{ u.name }}</div>
        </div>
        <span class="chip" :class="u.status === 'active' ? 'active' : 'danger'">
          {{ u.status === 'active' ? 'Active' : 'Disabled' }}
        </span>
        <div>{{ formatBytes(u.storage_used_bytes) }} / {{ formatBytes(u.storage_quota_bytes) }}</div>
        <div class="muted">{{ (u.created_at || '').slice(0, 10) }}</div>
        <div class="actions">
          <q-btn
            v-if="u.status === 'active' && !u.is_admin"
            outline
            dense
            no-caps
            class="danger-outline"
            label="Disable"
            @click="disableUser(u)"
          />
          <q-btn
            v-if="u.status === 'disabled'"
            flat
            dense
            no-caps
            color="primary"
            label="Enable"
            @click="enableUser(u)"
          />
          <q-btn flat dense no-caps label="Quota" @click="openQuota(u)" />
        </div>
      </div>
    </div>

    <q-dialog v-model="showQuota">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="text-h6">Override quota</div>
          <p class="muted">Default 5 GB</p>
        </q-card-section>
        <q-card-section>
          <q-input v-model.number="quotaGb" type="number" outlined dark dense label="Quota (GB)" :min="0" step="0.5" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn class="pill" unelevated no-caps label="Save" @click="saveQuota" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { engineAPI } from '@/helpers/api'
import AdminTabs from '@/components/admin/AdminTabs.vue'

const users = ref([])
const loading = ref(true)
const error = ref(false)
const showQuota = ref(false)
const quotaGb = ref(5)
const quotaUser = ref(null)

function formatBytes(n) {
  const v = Number(n) || 0
  if (v < 1024) return `${v} B`
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`
  if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)} MB`
  return `${(v / 1024 ** 3).toFixed(2)} GB`
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const data = await engineAPI.get('/admin/users')
    users.value = data.data || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function disableUser(u) {
  Dialog.create({
    title: `Disable ${u.email}?`,
    message: "They can't sign in.",
    cancel: true,
    ok: { label: 'Disable', color: 'negative', flat: true },
  }).onOk(async () => {
    await engineAPI.post(`/admin/users/${u.id}/disable`)
    await load()
  })
}

async function enableUser(u) {
  await engineAPI.post(`/admin/users/${u.id}/enable`)
  await load()
}

function openQuota(u) {
  quotaUser.value = u
  quotaGb.value = Math.round(((u.storage_quota_bytes || 0) / (1024 ** 3)) * 10) / 10 || 5
  showQuota.value = true
}

async function saveQuota() {
  const bytes = Math.round(Number(quotaGb.value) * 1024 ** 3)
  await engineAPI.patch(`/admin/users/${quotaUser.value.id}/quota`, { storage_quota_bytes: bytes })
  showQuota.value = false
  Notify.create({ message: 'Quota updated', color: 'dark', timeout: 2000 })
  await load()
}

onMounted(load)
</script>

<style scoped>

.admin-page { max-width: 960px; margin: 0 auto; padding: 24px 20px 80px; }
.head { margin-bottom: 20px; }
.head h1 { margin: 0; font-size: 1.75rem; }
.sub { color: var(--mt-text-muted); margin: 6px 0 0; }
.panel {
  border: 1px solid var(--mt-border);
  background: var(--mt-bg-panel);
  border-radius: 12px;
  overflow: hidden;
}
.row-item {
  display: grid;
  gap: 8px 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--mt-border);
  align-items: center;
}
.row-item:last-child { border-bottom: 0; }
.chip {
  display: inline-flex; border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600;
}
.chip.active { background: color-mix(in srgb, var(--mt-accent) 22%, transparent); color: var(--mt-accent); }
.chip.danger { background: color-mix(in srgb, #ff8f8f 22%, transparent); color: #ff8f8f; }
.empty, .err { padding: 28px; text-align: center; color: var(--mt-text-muted); }
.err { color: #ff8f8f; }
.muted { color: var(--mt-text-muted); }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.pill { border-radius: 999px !important; background: var(--mt-text) !important; color: var(--mt-bg) !important; }
.danger-outline { color: #ff8f8f !important; border-color: #ff8f8f !important; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
.search { max-width: 360px; }
.dialog-card {
  min-width: min(420px, 92vw);
  background: var(--mt-bg-elevated);
  border: 1px solid var(--mt-border);
  border-radius: 16px;
}

.user-row { grid-template-columns: 1.4fr 0.7fr 1fr 0.7fr auto; }
@media (max-width: 700px) { .user-row { grid-template-columns: 1fr; } }
</style>
