<template>
  <q-page class="admin-page">
    <header class="head">
      <h1 class="mt-display">Invite codes</h1>
      <p class="sub">Create and revoke friend invites</p>
    </header>
    <AdminTabs />
    <div class="toolbar">
      <span class="muted">{{ invites.length }} codes</span>
      <q-btn class="pill" unelevated no-caps label="Create invite" @click="showCreate = true" />
    </div>

    <div v-if="loading" class="panel">
      <div v-for="n in 3" :key="n" class="row-item skeleton">Loading…</div>
    </div>
    <div v-else-if="error" class="panel err">
      Couldn’t load invites
      <div><q-btn flat no-caps color="primary" label="Retry" @click="load" /></div>
    </div>
    <div v-else-if="!invites.length" class="panel empty">
      No invites yet
      <div class="q-mt-md"><q-btn class="pill" unelevated no-caps label="Create invite" @click="showCreate = true" /></div>
    </div>
    <div v-else class="panel">
      <div v-for="inv in invites" :key="inv.id" class="row-item invite-row">
        <div>
          <div class="mono">{{ inv.code }}</div>
          <div class="muted">{{ inv.label || '—' }}</div>
        </div>
        <div>{{ inv.uses_count }} / {{ inv.max_uses }}</div>
        <div class="muted">{{ inv.expires_at ? inv.expires_at.slice(0, 10) : 'Never' }}</div>
        <span class="chip" :class="chipClass(inv.status)">{{ statusLabel(inv.status) }}</span>
        <div class="actions">
          <q-btn flat dense round icon="content_copy" aria-label="Copy code" @click="copyCode(inv)" />
          <q-btn flat dense round icon="link" aria-label="Copy link" @click="copyLink(inv)" />
          <q-btn
            v-if="inv.status === 'active'"
            flat
            dense
            no-caps
            class="danger-outline"
            label="Revoke"
            @click="confirmRevoke(inv)"
          />
        </div>
      </div>
    </div>

    <q-dialog v-model="showCreate">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="text-h6">Create invite</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.label" outlined dark dense label="Label (optional)" />
          <q-input v-model.number="form.max_uses" type="number" outlined dark dense label="Max uses" :min="1" />
          <q-input v-model="form.expires_at" type="date" outlined dark dense label="Expires (optional)" clearable />
          <q-toggle v-model="form.generate" label="Generate code" color="primary" />
          <q-input v-if="!form.generate" v-model="form.code" outlined dark dense label="Code" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn class="pill" unelevated no-caps label="Create" :loading="creating" @click="create" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { Notify, Dialog } from 'quasar'
import { engineAPI } from '@/helpers/api'
import AdminTabs from '@/components/admin/AdminTabs.vue'

const invites = ref([])
const loading = ref(true)
const error = ref(false)
const showCreate = ref(false)
const creating = ref(false)
const form = reactive({ label: '', max_uses: 1, expires_at: '', generate: true, code: '' })

function chipClass(status) {
  if (status === 'active') return 'active'
  if (status === 'disabled') return 'danger'
  return 'dim'
}
function statusLabel(s) {
  return ({ active: 'Active', revoked: 'Revoked', expired: 'Expired', exhausted: 'Exhausted' })[s] || s
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const data = await engineAPI.get('/admin/invites')
    invites.value = data.data || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function create() {
  creating.value = true
  try {
    const payload = {
      label: form.label || null,
      max_uses: form.max_uses || 1,
      generate: form.generate,
      code: form.generate ? undefined : form.code,
      expires_at: form.expires_at || null,
    }
    await engineAPI.post('/admin/invites', payload)
    showCreate.value = false
    form.label = ''
    form.max_uses = 1
    form.expires_at = ''
    form.generate = true
    form.code = ''
    Notify.create({ message: 'Invite created', color: 'dark', timeout: 2500 })
    await load()
  } catch (e) {
    Notify.create({ message: e?.message || 'Could not create invite', color: 'negative' })
  } finally {
    creating.value = false
  }
}

function copyCode(inv) {
  navigator.clipboard?.writeText(inv.code)
  Notify.create({ message: 'Copied', color: 'dark', timeout: 1500 })
}
function copyLink(inv) {
  const url = `${window.location.origin}/#/register?code=${encodeURIComponent(inv.code)}`
  navigator.clipboard?.writeText(url)
  Notify.create({ message: 'Copied', color: 'dark', timeout: 1500 })
}
function confirmRevoke(inv) {
  Dialog.create({
    title: 'Revoke this invite?',
    message: 'New signups with this code will fail.',
    cancel: true,
    ok: { label: 'Revoke', color: 'negative', flat: true },
  }).onOk(async () => {
    await engineAPI.post(`/admin/invites/${inv.id}/revoke`)
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
.tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.tab {
  border: 1px solid var(--mt-border);
  background: transparent;
  color: var(--mt-text-muted);
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  font: inherit;
}
.tab.on { color: var(--mt-bg); background: var(--mt-accent); border-color: var(--mt-accent); }
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
.row-item:hover { background: var(--mt-bg-panel-hover, color-mix(in srgb, var(--mt-bg-panel) 80%, white 4%)); }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.04em; }
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 600;
}
.chip.active { background: color-mix(in srgb, var(--mt-accent) 22%, transparent); color: var(--mt-accent); }
.chip.dim { background: color-mix(in srgb, var(--mt-text-muted) 18%, transparent); color: var(--mt-text-muted); }
.chip.danger { background: color-mix(in srgb, #ff8f8f 22%, transparent); color: #ff8f8f; }
.empty, .err { padding: 28px; text-align: center; color: var(--mt-text-muted); }
.err { color: #ff8f8f; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
.pill {
  border-radius: 999px !important;
  background: var(--mt-text) !important;
  color: var(--mt-bg) !important;
}
.danger-outline { color: #ff8f8f !important; border-color: #ff8f8f !important; }
.muted { color: var(--mt-text-muted); }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }

.invite-row { grid-template-columns: 1.4fr 0.6fr 0.8fr 0.7fr auto; }
.dialog-card {
  min-width: min(420px, 92vw);
  background: var(--mt-bg-elevated);
  border: 1px solid var(--mt-border);
  border-radius: 16px;
}
@media (max-width: 700px) {
  .invite-row { grid-template-columns: 1fr; }
}
</style>
