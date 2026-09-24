<template>
  <q-page class="mt-page page">
    <header class="head row items-end justify-between">
      <div>
        <h1 class="mt-display">Library</h1>
        <p class="sub">
          {{
            filterMode === 'downloaded'
              ? `${offline.downloadedCount} downloaded`
              : library.trackCount
                ? `${library.trackCount} tracks`
                : 'Songs you own - private by default'
          }}
        </p>
      </div>
      <q-input
        v-if="filterMode === 'all'"
        v-model="search"
        dense
        dark
        outlined
        clearable
        placeholder="Filter..."
        class="search"
        @update:model-value="onSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </header>

    <div class="filter-row row q-gutter-sm q-mb-md">
      <button
        type="button"
        class="filter-chip"
        :class="{ on: filterMode === 'all' }"
        @click="setFilter('all')"
      >
        {{ copy.filter.all }}
      </button>
      <button
        type="button"
        class="filter-chip"
        :class="{ on: filterMode === 'downloaded' }"
        @click="setFilter('downloaded')"
      >
        {{ copy.filter.downloaded }}
      </button>
    </div>

    <UploadDropzone
      v-if="filterMode === 'all'"
      class="q-mb-lg"
      @uploaded="onUploaded"
    />

    <div v-if="filterMode === 'all' && library.uploadProgress.length" class="progress q-mb-md">
      <div v-for="(item, i) in library.uploadProgress.slice(0, 5)" :key="i" class="prog-row">
        <span class="ellipsis">{{ item.name }}</span>
        <span :class="item.status">{{ statusLabel(item) }}</span>
      </div>
    </div>

    <template v-if="filterMode === 'downloaded'">
      <div v-if="!offline.hydrated && offline.hydrating" class="state">Loading...</div>
      <div v-else-if="!downloadedTracks.length" class="state muted empty-dl column items-start">
        <div class="mt-empty-art art" />
        <p class="empty-title">
          {{ isOffline ? copy.empty.downloadedOffline : copy.empty.downloadedOnline }}
        </p>
        <p v-if="!isOffline" class="empty-hint">{{ copy.empty.downloadedHint }}</p>
      </div>
      <div v-else class="list">
        <TrackRow
          v-for="(track, index) in downloadedTracks"
          :key="track.id"
          :track="track"
          :show-add="false"
          :show-remove="false"
          @play="onPlayDownloaded(index)"
          @like="onLike"
        />
      </div>
    </template>

    <template v-else>
      <div v-if="library.loading" class="state">Loading library...</div>
      <div v-else-if="library.error && !library.tracks.length" class="state error">
        {{ library.error }}
      </div>
      <div v-else-if="library.isEmpty" class="state muted">
        Drop a file above to start your collection.
      </div>
      <div v-else class="list">
        <TrackRow
          v-for="(track, index) in library.tracks"
          :key="track.id"
          :track="track"
          show-add
          @play="onPlay(index)"
          @add="onAdd"
          @like="onLike"
          @remove="onRemove"
        />
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import UploadDropzone from '@/components/library/UploadDropzone.vue'
import TrackRow from '@/components/library/TrackRow.vue'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { useConnectivity } from '@/composables/useConnectivity'
import { useLibraryStore } from '@/stores/library-store'
import { useOfflineStore } from '@/stores/offline-store'
import { usePlayerStore } from '@/stores/player-store'
import { usePlaylistStore } from '@/stores/playlist-store'
import { useLikesStore } from '@/stores/likes-store'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const offline = useOfflineStore()
const player = usePlayerStore()
const playlists = usePlaylistStore()
const likes = useLikesStore()
const connectivity = useConnectivity()
const { isOffline } = connectivity
const copy = OFFLINE_COPY
const search = ref('')
const filterMode = ref('all')
let searchTimer = null

const downloadedTracks = computed(() =>
  offline.downloadedList.map((row) => ({
    ...row.meta,
    id: row.id,
  })),
)

function setFilter(mode) {
  filterMode.value = mode
  const query = { ...route.query }
  if (mode === 'downloaded') {
    query.offline = '1'
  } else {
    delete query.offline
  }
  router.replace({ name: 'library', query })
}

function syncFilterFromRoute() {
  filterMode.value = route.query.offline === '1' ? 'downloaded' : 'all'
}

onMounted(() => {
  syncFilterFromRoute()
  offline.hydrate().catch(() => {})
  library.fetchTracks().catch(() => {})
  playlists.fetchPlaylists().catch(() => {})
})

watch(() => route.query.offline, syncFilterFromRoute)

function onSearch(value) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    library.fetchTracks(value || '').catch(() => {})
  }, 250)
}

function onUploaded() {
  $q.notify({ type: 'positive', message: 'Upload complete', position: 'top' })
}

function onPlay(index) {
  player.playQueue(library.tracks, index)
}

function onPlayDownloaded(index) {
  player.playQueue(downloadedTracks.value, index)
}

async function onLike(track) {
  if (!connectivity.requireOnline()) return
  try {
    await likes.toggle(track)
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.message || 'Could not update like' })
  }
}

async function onAdd(track) {
  if (!connectivity.requireOnline()) return
  if (!playlists.playlists.length) {
    await playlists.fetchPlaylists().catch(() => {})
  }

  if (!playlists.playlists.length) {
    $q.dialog({
      title: 'No playlists yet',
      message: 'Create a playlist first, then add this track.',
      ok: { label: 'Go to Playlists', color: 'primary' },
      cancel: true,
      dark: true,
    }).onOk(() => {
      router.push({ name: 'playlists' })
    })
    return
  }

  $q.dialog({
    title: 'Add to playlist',
    options: {
      type: 'radio',
      model: playlists.playlists[0].id,
      items: playlists.playlists.map((p) => ({
        label: p.title,
        value: p.id,
      })),
    },
    cancel: true,
    persistent: true,
    dark: true,
    ok: { label: 'Add', color: 'primary' },
  }).onOk(async (playlistId) => {
    try {
      await playlists.addTrack(playlistId, track.id)
      $q.notify({ type: 'positive', message: 'Added to playlist', position: 'top' })
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.message || 'Could not add', position: 'top' })
    }
  })
}

async function onRemove(track) {
  if (!connectivity.requireOnline()) return
  $q.dialog({
    title: 'Remove track?',
    message: `Delete "${track.title}" from your library?`,
    cancel: true,
    persistent: true,
    dark: true,
  }).onOk(async () => {
    try {
      await library.removeTrack(track.id)
      if (player.currentTrack?.id === track.id) player.clear()
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.message || 'Delete failed' })
    }
  })
}

function statusLabel(item) {
  if (item.status === 'uploading') {
    return item.pct ? `Uploading ${item.pct}%` : 'Uploading...'
  }
  if (item.status === 'done') return 'Done'
  return item.error || 'Failed'
}
</script>

<style scoped>
.page {
  padding: 36px 36px 48px;
  max-width: 1100px;
}

@media (max-width: 599px) {
  .page {
    padding: 24px 18px 40px;
  }
}

.head {
  margin-bottom: 16px;
  gap: 16px;
}

h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
}

.sub {
  margin: 8px 0 0;
  color: var(--mt-text-muted);
}

.search {
  width: min(240px, 100%);
}

.filter-chip {
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

.filter-chip:hover {
  color: var(--mt-text);
  background: var(--mt-bg-panel-hover);
}

.filter-chip.on {
  color: var(--mt-bg);
  background: var(--mt-accent);
  border-color: transparent;
}

.filter-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--mt-accent-soft);
}

.progress {
  border: 1px solid var(--mt-border);
  border-radius: 12px;
  padding: 10px 14px;
  background: var(--mt-bg-panel);
}

.prog-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85rem;
  padding: 4px 0;
}

.prog-row .done {
  color: var(--mt-accent);
}

.prog-row .error {
  color: #ff8f8f;
}

.prog-row .uploading {
  color: var(--mt-text-muted);
}

.state {
  padding: 28px 8px;
  color: var(--mt-text-muted);
}

.state.error {
  color: #ff8f8f;
}

.empty-dl {
  gap: 8px;
}

.art {
  width: 120px;
  height: 72px;
  border-radius: 12px;
  margin-bottom: 8px;
  background:
    radial-gradient(circle at 70% 30%, rgba(61, 255, 181, 0.35), transparent 42%),
    linear-gradient(145deg, #1c2030, #0d1018);
}

.empty-title {
  margin: 0;
  font-weight: 600;
  color: var(--mt-text);
}

.empty-hint {
  margin: 0;
  color: var(--mt-text-dim);
  font-size: 0.9rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
