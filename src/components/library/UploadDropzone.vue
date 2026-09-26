<template>
  <div
    class="dropzone"
    :class="{ active: dragging, busy: library.uploading, offline: isOffline }"
    @dragenter.prevent="onEnter"
    @dragover.prevent="onEnter"
    @dragleave.prevent="onLeave"
    @drop.prevent="onDrop"
    @click="onZoneClick"
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
      <div class="title">{{ isOffline ? 'Uploads need a connection' : 'Drop audio or click' }}</div>
      <div v-if="!isOffline" class="sub">mp3 · m4a · flac · wav</div>
      <q-btn
        v-if="!isOffline"
        class="browse"
        unelevated
        no-caps
        label="Choose files"
        :disable="library.uploading"
        @click.stop="onBrowse"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useConnectivity } from '@/composables/useConnectivity'
import { useLibraryStore } from '@/stores/library-store'

const emit = defineEmits(['uploaded'])

const library = useLibraryStore()
const connectivity = useConnectivity()
const inputEl = ref(null)
const dragging = ref(false)
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

function onDrop(event) {
  if (isOffline.value) {
    connectivity.requireOnline()
    return
  }
  handleFiles(event.dataTransfer?.files)
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

// Library empty state opens the same file picker
defineExpose({ browse: onBrowse })
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
  pointer-events: none;
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

.browse {
  margin-top: 18px;
  background: var(--mt-text) !important;
  color: #07080c !important;
  border-radius: 999px;
  padding: 0 18px;
  font-weight: 600;
}
</style>
