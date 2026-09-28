<template>
  <q-page class="admin-page">
    <header class="head">
      <h1 class="mt-display">{{ copy.tab }}</h1>
      <p class="sub">{{ copy.pageSub }}</p>
    </header>
    <AdminTabs />

    <div class="top-row">
      <section class="panel card" aria-labelledby="yt-cookies-title">
        <div class="card-head row items-center justify-between no-wrap">
          <h2 id="yt-cookies-title" class="card-title">{{ copy.cookiesTitle }}</h2>
          <span v-if="status" class="set-chip" :class="{ on: status.cookies_set }">
            <q-icon
              :name="status.cookies_set ? 'check_circle' : 'radio_button_unchecked'"
              size="14px"
            />
            {{ status.cookies_set ? copy.cookiesSet : copy.cookiesNotSet }}
          </span>
        </div>
        <p class="muted body">{{ copy.cookiesBody }}</p>
        <div class="row items-center upload-row">
          <input
            ref="cookiesInput"
            class="hidden-input"
            type="file"
            accept=".txt,text/plain"
            @change="onCookiesPicked"
          />
          <q-btn
            unelevated
            no-caps
            class="pill"
            icon="upload_file"
            :label="status?.cookies_set ? copy.replace : copy.upload"
            :loading="savingCookies"
            @click="cookiesInput?.click()"
          />
          <span class="dim">{{ copy.replaceHint }}</span>
        </div>
        <p v-if="cookiesError" class="err-line" role="alert">{{ cookiesError }}</p>
        <p class="hint row no-wrap items-start">
          <q-icon name="info_outline" size="16px" />
          <span>{{ copy.cookiesStale }}</span>
        </p>
      </section>

      <section class="panel card" aria-labelledby="yt-dlp-title">
        <div class="card-head row items-center justify-between no-wrap">
          <h2 id="yt-dlp-title" class="card-title">{{ copy.ytdlpTitle }}</h2>
          <q-btn
            flat
            round
            dense
            icon="refresh"
            :aria-label="copy.refresh"
            :loading="statusLoading"
            @click="loadStatus"
          />
        </div>
        <div v-if="statusError" class="err-line row items-center">
          {{ copy.statusFail }}
          <q-btn flat no-caps dense :label="retryLabel" @click="loadStatus" />
        </div>
        <dl v-else class="facts">
          <div class="fact">
            <dt>{{ copy.version }}</dt>
            <dd class="mono">{{ status?.yt_dlp_version || '—' }}</dd>
          </div>
          <div class="fact">
            <dt>{{ copy.cookiesRow }}</dt>
            <dd>{{ status?.cookies_set ? copy.cookiesSet : copy.cookiesNotSet }}</dd>
          </div>
          <div class="fact">
            <dt>{{ copy.updateRow }}</dt>
            <dd class="dim">{{ copy.updateHint }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <section aria-labelledby="yt-imports-title">
      <div class="imports-head row items-center justify-between">
        <h2 id="yt-imports-title" class="mt-display imports-title">
          {{ copy.importsTitle }} <span class="dim">· {{ copy.importsSub }}</span>
        </h2>
        <div class="filters row">
          <button
            v-for="(label, key) in copy.filter"
            :key="key"
            type="button"
            class="tab"
            :class="{ on: filter === key }"
            @click="filter = key"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <div v-if="importsLoading" class="panel">
        <div v-for="n in SKELETON_ROWS" :key="n" class="row-item">
          <q-skeleton type="text" dark />
        </div>
      </div>
      <div v-else-if="importsError" class="panel err">
        {{ copy.listFail }} <q-btn flat no-caps :label="retryLabel" @click="loadImports" />
      </div>
      <div v-else-if="!filteredImports.length" class="panel empty">{{ copy.empty }}</div>
      <div v-else class="panel">
        <div class="row-item import-grid table-head gt-xs" aria-hidden="true">
          <span v-for="(label, key) in copy.columns" :key="key">{{ label }}</span>
        </div>
        <template v-for="item in filteredImports" :key="item.id">
          <div class="row-item import-grid">
            <div class="ellipsis">{{ item.owner?.email }}</div>
            <div class="video row no-wrap items-center">
              <div class="thumb flex flex-center">
                <img
                  v-if="thumbFor(item) && !isBrokenImage(thumbFor(item))"
                  :src="thumbFor(item)"
                  alt=""
                  @error="markBrokenImage(thumbFor(item))"
                />
                <q-icon v-else name="link" size="18px" />
              </div>
              <div class="col ellipsis">
                <div class="ellipsis">{{ item.title || `youtu.be/${item.video_id}` }}</div>
                <a :href="item.url" target="_blank" rel="noopener" class="mono dim ellipsis url">
                  {{ item.url }}
                </a>
              </div>
            </div>
            <div>
              <ImportStatusChip short :status="item.status" :reason-code="item.reason_code" />
            </div>
            <div class="reason">
              <template v-if="item.reason_code">
                {{ item.reason_code
                }}<template v-if="item.attempts > 1">
                  · {{ copy.attempts(item.attempts) }}</template
                >
              </template>
              <span v-else class="dim">—</span>
            </div>
            <div class="muted">
              {{ formatRelative(item.created_at) }}
              <q-tooltip>{{ formatAbsolute(item.created_at) }}</q-tooltip>
            </div>
            <div class="actions row no-wrap justify-end">
              <q-btn
                v-if="item.error_detail"
                flat
                round
                dense
                :icon="expanded.has(item.id) ? 'expand_less' : 'expand_more'"
                :aria-label="copy.showDetail"
                :aria-expanded="expanded.has(item.id)"
                @click="toggleDetail(item.id)"
              />
              <q-btn
                v-if="!RUNNING.includes(item.status)"
                flat
                round
                dense
                icon="delete_outline"
                class="danger"
                :aria-label="copy.deleteLabel"
                @click="confirmDelete(item)"
              />
            </div>
          </div>
          <q-slide-transition>
            <div v-if="expanded.has(item.id)" class="row-item detail mono">
              <span class="dim">{{ copy.errorDetail }}:</span> {{ item.error_detail }}
            </div>
          </q-slide-transition>
        </template>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { engineAPI } from '@/helpers/api'
import AdminTabs from '@/components/admin/AdminTabs.vue'
import ImportStatusChip from '@/components/library/ImportStatusChip.vue'
import { ERROR_COPY } from '@/constants/error-copy'
import { ADMIN_YOUTUBE_COPY } from '@/constants/youtube-copy'
import { isBrokenImage, markBrokenImage } from '@/helpers/brokenImages'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'
import { toUserMessage } from '@/helpers/userError'

const ACTIVE = ['queued', 'downloading', 'processing']
/** A worker holds these; the engine refuses deletes until they settle */
const RUNNING = ['downloading', 'processing']
const SKELETON_ROWS = 3
const MAX_COOKIES_BYTES = 1024 * 1024
const RELATIVE_UNITS = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

const copy = ADMIN_YOUTUBE_COPY
const retryLabel = ERROR_COPY.retry
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const status = ref(null)
const statusLoading = ref(false)
const statusError = ref(false)
const cookiesInput = ref(null)
const savingCookies = ref(false)
const cookiesError = ref('')
const imports = ref([])
const importsLoading = ref(false)
const importsError = ref(false)
const filter = ref('all')
const expanded = reactive(new Set())

const filteredImports = computed(() => {
  if (filter.value === 'active') return imports.value.filter((i) => ACTIVE.includes(i.status))
  if (filter.value === 'failed') return imports.value.filter((i) => i.status === 'failed')
  return imports.value
})

function thumbFor(item) {
  return toEngineProxyUrl(item.thumbnail_url)
}

function formatRelative(iso) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const [unit, size] = RELATIVE_UNITS.find(([, s]) => Math.abs(seconds) >= s) || ['second', 1]
  return relativeFormat.format(Math.round(seconds / size), unit)
}

function formatAbsolute(iso) {
  return new Date(iso).toLocaleString()
}

function toggleDetail(id) {
  if (expanded.has(id)) expanded.delete(id)
  else expanded.add(id)
}

async function loadStatus() {
  statusLoading.value = true
  statusError.value = false
  try {
    status.value = (await engineAPI.get('/admin/youtube/status')).data
  } catch {
    statusError.value = true
  } finally {
    statusLoading.value = false
  }
}

async function loadImports() {
  importsLoading.value = true
  importsError.value = false
  try {
    imports.value = (await engineAPI.get('/admin/imports')).data || []
  } catch {
    importsError.value = true
  } finally {
    importsLoading.value = false
  }
}

async function onCookiesPicked(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  cookiesError.value = ''
  if (file.size > MAX_COOKIES_BYTES) {
    cookiesError.value = copy.cookiesFail
    return
  }
  savingCookies.value = true
  try {
    const res = await engineAPI.put('/admin/youtube/cookies', { cookies: await file.text() })
    status.value = { ...status.value, cookies_set: res.data.cookies_set }
    Notify.create({ message: copy.cookiesSaved, color: 'dark', timeout: 2000 })
  } catch (err) {
    cookiesError.value = toUserMessage(err, copy.cookiesFail, {
      context: 'cookies upload',
      allowServerMessage: false,
    })
  } finally {
    savingCookies.value = false
  }
}

function confirmDelete(item) {
  Dialog.create({
    title: copy.deleteTitle,
    message: copy.deleteBody(item.owner?.email || 'this user'),
    cancel: { flat: true, noCaps: true },
    ok: { label: copy.deleteConfirm, color: 'negative', outline: true, noCaps: true },
    dark: true,
  }).onOk(async () => {
    try {
      await engineAPI.delete(`/admin/imports/${item.id}`)
      Notify.create({ message: copy.deleted, color: 'dark', timeout: 2000 })
      await loadImports()
    } catch (err) {
      Notify.create({
        type: 'negative',
        message: toUserMessage(err, copy.deleteFail, { context: 'admin import delete' }),
      })
    }
  })
}

onMounted(() => {
  loadStatus()
  loadImports()
})
</script>

<style scoped>
.admin-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}

.head {
  margin-bottom: 20px;
}

.head h1 {
  margin: 0;
  font-size: 1.75rem;
}

.sub {
  color: var(--mt-text-muted);
  margin: 6px 0 0;
}

.panel {
  border: 1px solid var(--mt-border);
  background: var(--mt-bg-panel);
  border-radius: 12px;
  overflow: hidden;
}

.top-row {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}

.card {
  padding: 18px 20px;
  border-radius: 16px;
}

.card-head {
  gap: 12px;
}

.card-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
}

.body {
  margin: 8px 0 14px;
  font-size: 0.88rem;
}

.set-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--mt-bg-panel-hover);
  color: var(--mt-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.set-chip.on {
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
}

.upload-row {
  gap: 12px;
}

.hidden-input {
  display: none;
}

.pill {
  border-radius: 999px !important;
  background: var(--mt-text) !important;
  color: var(--mt-bg) !important;
  font-weight: 600;
}

.hint {
  gap: 8px;
  margin: 14px 0 0;
  color: var(--mt-text-muted);
  font-size: 0.82rem;
}

.err-line {
  margin: 10px 0 0;
  color: #ff8f8f;
  font-size: 0.88rem;
}

.facts {
  margin: 12px 0 0;
}

.fact {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 0.9rem;
}

.fact dt {
  color: var(--mt-text-muted);
}

.fact dd {
  margin: 0;
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.muted {
  color: var(--mt-text-muted);
}

.dim {
  color: var(--mt-text-dim);
}

.imports-head {
  gap: 12px;
  margin-bottom: 12px;
}

.imports-title {
  margin: 0;
  font-size: 1.4rem;
}

.imports-title .dim {
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 400;
}

.filters {
  gap: 8px;
}

.tab {
  border: 1px solid var(--mt-border);
  background: transparent;
  color: var(--mt-text-muted);
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font: inherit;
}

.tab.on {
  color: var(--mt-bg);
  background: var(--mt-accent);
  border-color: var(--mt-accent);
}

.row-item {
  display: grid;
  gap: 8px 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--mt-border);
  align-items: center;
}

.row-item:last-child {
  border-bottom: 0;
}

.import-grid {
  grid-template-columns: 1.1fr 2fr 1fr 1.3fr 0.9fr 88px;
}

.table-head {
  color: var(--mt-text-dim);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.video {
  gap: 10px;
  min-width: 0;
}

.thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.url {
  display: block;
  font-size: 0.75rem;
  text-decoration: none;
}

.reason {
  color: #ff8f8f;
  font-size: 0.85rem;
}

.actions {
  gap: 4px;
}

.danger {
  color: #ff8f8f !important;
}

.detail {
  display: block;
  font-size: 0.78rem;
  color: var(--mt-text-muted);
  word-break: break-word;
}

.empty,
.err {
  padding: 28px;
  text-align: center;
  color: var(--mt-text-muted);
}

.err {
  color: #ff8f8f;
}

@media (max-width: 599px) {
  .top-row {
    grid-template-columns: 1fr;
  }

  .import-grid {
    grid-template-columns: 1fr auto;
  }

  .import-grid > .video,
  .import-grid > .reason {
    grid-column: 1 / -1;
  }
}
</style>
