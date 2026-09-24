<template>
  <div
    class="dropzone"
    :class="{ active: dragging, busy: library.uploading }"
    @dragenter.prevent="onEnter"
    @dragover.prevent="onEnter"
    @dragleave.prevent="onLeave"
    @drop.prevent="onDrop"
  >
    <input
      ref="inputEl"
      class="hidden-input"
      type="file"
      accept=".mp3,.m4a,.flac,.wav,audio/mpeg,audio/mp4,audio/flac,audio/wav"
      multiple
      @change="onPick"
    />

    <div class="inner column items-center text-center">
      <div class="icon-wrap flex flex-center">
        <q-icon name="upload_file" size="32px" />
      </div>
      <div class="title">Drop audio here</div>
      <div class="sub">mp3 · m4a · flac · wav — or click to browse</div>
      <q-btn
        class="browse"
        unelevated
        no-caps
        label="Choose files"
        :disable="library.uploading"
        @click="inputEl?.click()"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/library-store'

const emit = defineEmits(['uploaded'])

const library = useLibraryStore()
const inputEl = ref(null)
const dragging = ref(false)
let dragDepth = 0

function onEnter() {
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
  const created = await library.uploadFiles(files)
  if (created.length) emit('uploaded', created)
}

function onDrop(event) {
  handleFiles(event.dataTransfer?.files)
}

function onPick(event) {
  handleFiles(event.target.files)
  event.target.value = ''
}
</script>

<style scoped>
.dropzone {
  position: relative;
  border: 1px dashed var(--mt-border);
  border-radius: 20px;
  background: var(--mt-bg-panel);
  padding: 36px 20px;
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
