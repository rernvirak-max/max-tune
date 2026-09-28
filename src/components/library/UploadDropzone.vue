<template>
  <div
    class="dropzone"
    :class="{ active: dragging, busy: library.uploading || library.importing, offline: isOffline }"
    @dragenter.prevent="onEnter"
    @dragover.prevent="onEnter"
    @dragleave.prevent="onLeave"
    @drop.prevent="onDrop"
    @click="onZoneClick"
    @paste="onPaste"
  >
    <input
      ref="inputEl"
      class="hidden-input"
      type="file"
      accept=".mp3,.m4a,.flac,.wav,audio/mpeg,audio/mp4,audio/flac,audio/wav"
      multiple
      :disabled="isOffline || library.uploading"
      @change="onPick"
    />

    <div class="inner column items-center text-center">
      <div class="icon-wrap flex flex-center">
        <q-icon :name="isOffline ? 'cloud_off' : 'upload_file'" size="32px" />
      </div>
      <div class="title">{{ isOffline ? 'Connect to upload' : 'Drop audio or click' }}</div>
      <div class="sub">
        {{ isOffline ? copy.err.mutation : 'mp3 · m4a · flac · wav · paste a YouTube link' }}
      </div>
      <div class="url-row row items-center q-gutter-sm">
        <q-input
          v-model="youtubeUrl"
          dense
          dark
          outlined
          clearable
          class="url-input"
          placeholder="Paste YouTube URL…"
          :disable="isOffline || library.importing"
          @keyup.enter.stop="onSubmitUrl"
          @click.stop
        />
        <q-btn
          class="browse"
          unelevated
          no-caps
          label="Import"
          :disable="isOffline || library.importing || !youtubeUrl.trim()"
          :loading="library.importing"
          @click.stop="onSubmitUrl"
        />
      </div>
      <q-btn
        class="browse files"
        unelevated
        no-caps
        :label="isOffline ? copy.err.mutation : 'Choose files'"
        :disable="library.uploading || isOffline"
        @click.stop="onBrowse"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Notify } from 'quasar'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { useConnectivity } from '@/composables/useConnectivity'
import { useLibraryStore } from '@/stores/library-store'
import { extractYoutubeUrl } from '@/services/engine/youtube'

const emit = defineEmits(['uploaded', 'imported'])

const library = useLibraryStore()
const connectivity = useConnectivity()
const copy = OFFLINE_COPY
const inputEl = ref(null)
const dragging = ref(false)
const youtubeUrl = ref('')
let dragDepth = 0

const isOffline = computed(() => connectivity.isOffline.value)

function onEnter() {
  if (isOffline.value) return
  dragDepth += 1
  dragging.value = true
}

function onLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}

async function handleFiles(files) {
  dragging.value = false
  dragDepth = 0
  if (!connectivity.requireOnline()) return
  const created = await library.uploadFiles(files)
  if (created.length) emit('uploaded', created)
}

async function importUrl(text) {
  if (!connectivity.requireOnline()) return
  try {
    const item = await library.importYoutubeFromText(text)
    if (!item) {
      Notify.create({ type: 'negative', message: 'Paste a valid YouTube link', position: 'top' })
      return
    }
    youtubeUrl.value = ''
    emit('imported', item)
    Notify.create({ type: 'positive', message: 'YouTube import queued', position: 'top' })
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: err?.message || 'Could not queue YouTube import',
      position: 'top',
    })
  }
}

function onDrop(event) {
  if (isOffline.value) {
    connectivity.requireOnline()
    return
  }
  const uri = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text')
  if (extractYoutubeUrl(uri || '')) {
    importUrl(uri)
    dragging.value = false
    dragDepth = 0
    return
  }
  handleFiles(event.dataTransfer?.files)
}

function onPaste(event) {
  const text = event.clipboardData?.getData('text') || ''
  if (!extractYoutubeUrl(text)) return
  event.preventDefault()
  importUrl(text)
}

function onSubmitUrl() {
  importUrl(youtubeUrl.value)
}

function onPick(event) {
  handleFiles(event.target.files)
  event.target.value = ''
}

function onBrowse() {
  if (!connectivity.requireOnline()) return
  inputEl.value?.click()
}

function onZoneClick() {
  if (isOffline.value) connectivity.requireOnline()
}
</script>

<style scoped>
.dropzone {
  position: relative;
  border: 1px dashed var(--mt-border);
  border-radius: 20px;
  background: var(--mt-bg-panel);
  padding: 36px 20px;
  min-height: 120px;
  transition:
    border-color 180ms var(--ease-out),
    background 180ms var(--ease-out),
    transform 180ms var(--ease-out);
}

.dropzone.active {
  border-color: rgba(61, 255, 181, 0.55);
  background: var(--mt-accent-soft);
  transform: scale(1.01);
}

.dropzone.busy {
  opacity: 0.75;
}

.dropzone.offline {
  opacity: 0.7;
}

.hidden-input {
  display: none;
}

.icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--mt-accent);
  margin-bottom: 14px;
}

.title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
}

.sub {
  margin-top: 6px;
  color: var(--mt-text-muted);
  font-size: 0.9rem;
}

.url-row {
  margin-top: 16px;
  width: min(520px, 100%);
  justify-content: center;
}

.url-input {
  flex: 1;
  min-width: 0;
}

.browse {
  background: var(--mt-text) !important;
  color: #07080c !important;
  border-radius: 999px;
  padding: 0 18px;
  font-weight: 600;
}

.browse.files {
  margin-top: 14px;
}
</style>
