<template>
  <q-page class="admin-page">
    <header class="head">
      <h1 class="mt-display">Tracks</h1>
      <p class="sub">Remove abusive uploads</p>
    </header>
    <AdminTabs />

    <div class="toolbar">
      <q-input
        v-model="q"
        class="search"
        outlined
        dark
        dense
        clearable
        placeholder="Track id or title"
        @keyup.enter="load"
      >
        <template #append>
          <q-btn flat dense round icon="search" @click="load" />
        </template>
      </q-input>
      <q-input v-model="email" class="search" outlined dark dense clearable placeholder="Owner email" @keyup.enter="load" />
    </div>

    <div v-if="loading" class="panel"><div class="row-item">Loading…</div></div>
    <div v-else-if="error" class="panel err">Couldn’t load tracks <q-btn flat label="Retry" @click="load" /></div>
    <div v-else-if="!tracks.length" class="panel empty">No matches</div>
    <div v-else class="panel">
      <div v-for="t in tracks" :key="t.id" class="row-item track-row">
        <div>
          <div>{{ t.title }}</div>
          <div class="muted">{{ t.artist_name || '—' }} · #{{ t.id }}</div>
        </div>
        <div class="muted">{{ t.owner?.email }}</div>
        <div>{{ formatBytes(t.size) }}</div>
        <q-btn
          outline
          dense
          no-caps
          class="danger-outline"
          label="Remove"
          @click="removeTrack(t)"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { engineAPI } from '@/helpers/api'
import AdminTabs from '@/components/admin/AdminTabs.vue'

const tracks = ref([])
const loading = ref(false)
const error = ref(false)
const q = ref('')
const email = ref('')

function formatBytes(n) {
  const v = Number(n) || 0
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`
  return `${(v / 1024 ** 2).toFixed(1)} MB`
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const params = new URLSearchParams()
    if (q.value) params.set('q', q.value)
    if (email.value) params.set('email', email.value)
    const qs = params.toString()
    const data = await engineAPI.get(`/admin/tracks${qs ? `?${qs}` : ''}`)
    tracks.value = data.data || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function removeTrack(t) {
  Dialog.create({
    title: `Remove this track for ${t.owner?.email || 'user'}?`,
    message: 'File is deleted; their library updates.',
    cancel: true,
    ok: { label: 'Remove', color: 'negative', flat: true },
  }).onOk(async () => {
    await engineAPI.delete(`/admin/tracks/${t.id}`)
    Notify.create({ message: 'Track removed', color: 'dark', timeout: 2000 })
    await load()
  })
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

.track-row { grid-template-columns: 1.5fr 1fr 0.6fr auto; }
@media (max-width: 700px) { .track-row { grid-template-columns: 1fr; } }
</style>
