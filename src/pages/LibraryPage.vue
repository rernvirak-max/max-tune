<template>
  <q-page class="mt-page page">
    <header class="head row items-end justify-between">
      <div class="col">
        <h1 class="mt-display">Library</h1>
        <p class="sub">
          {{
            filterMode === 'downloaded'
              ? `${offline.downloadedCount} downloaded`
              : library.trackCount
                ? `${library.trackCount} tracks`
                : 'Songs you own - private by default'
          }}<template v-if="imports.activeCount"> · {{ imports.activeCount }} importing</template>
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
      <q-btn
        ref="youtubeEntry"
        rounded
        unelevated
        no-caps
        class="yt-entry"
        :class="{ 'is-offline': isOffline }"
        icon="add_link"
        :label="$q.screen.xs ? ytCopy.entryShort : ytCopy.entry"
        :aria-label="ytCopy.entry"
        :aria-disabled="isOffline"
        @click="openYoutubeDialog"
      />
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

    <div
      v-if="filterMode === 'all' && isOffline"
      class="offline-card column items-center text-center q-mb-lg"
      role="status"
    >
      <div class="offline-icon flex flex-center">
        <q-icon :name="isBrowserOffline ? 'wifi_off' : 'cloud_off'" size="30px" />
      </div>
      <div class="offline-title">
        {{ isBrowserOffline ? copy.empty.offlineTitle : copy.empty.unreachableTitle }}
      </div>
      <p class="offline-text">{{ copy.empty.offlineText }}</p>
      <q-btn
        unelevated
        no-caps
        class="offline-cta"
        icon="download_done"
        :label="copy.empty.showDownloads"
        @click="setFilter('downloaded')"
      />
    </div>
    <UploadDropzone
      v-else-if="filterMode === 'all'"
      ref="dropzone"
      class="q-mb-lg"
      @uploaded="onUploaded"
    />

    <div v-if="filterMode === 'all' && library.uploadProgress.length" class="progress q-mb-md">
      <div v-for="(item, i) in library.uploadProgress.slice(0, 5)" :key="i" class="prog-row">
        <span class="ellipsis">{{ item.name }}</span>
        <span :class="item.status">{{ statusLabel(item) }}</span>
      </div>
    </div>

    <ImportsGroup v-if="filterMode === 'all'" />

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
      <LoadError
        v-else-if="library.error && !library.tracks.length"
        :message="library.error"
        @retry="loadLibrary"
      />
      <div
        v-else-if="library.isEmpty && !library.error && !isOffline"
        class="state muted empty-lib column items-start"
      >
        <div class="mt-empty-art art" />
        <p class="empty-title">{{ ytCopy.emptyTitle }}</p>
        <p class="empty-hint">{{ ytCopy.emptyBody }}</p>
        <div class="empty-actions row items-center">
          <q-btn
            outline
            rounded
            no-caps
            class="empty-upload"
            icon="upload"
            :label="ytCopy.emptyUpload"
            @click="dropzone?.browse()"
          />
          <q-btn
            rounded
            unelevated
            no-caps
            class="yt-entry"
            icon="add_link"
            :label="ytCopy.entry"
            @click="openYoutubeDialog"
          />
        </div>
      </div>
      <div v-else class="list">
        <TrackRow
          v-for="(track, index) in library.tracks"
          :id="`track-${track.id}`"
          :key="track.id"
          :track="track"
          :fresh="imports.freshTrackIds.includes(track.id)"
          :class="{ flash: flashTrackId === track.id }"
          show-add
          @play="onPlay(index)"
          @add="onAdd"
          @like="onLike"
          @remove="onRemove"
        />
      </div>
    </template>

    <YoutubeImportDialog
      v-model="youtubeDialogOpen"
      @open-track="scrollToTrack"
      @see-imports="scrollToImports"
      @hide="restoreEntryFocus"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import UploadDropzone from '@/components/library/UploadDropzone.vue'
import TrackRow from '@/components/library/TrackRow.vue'
import ImportsGroup from '@/components/library/ImportsGroup.vue'
import YoutubeImportDialog from '@/components/library/YoutubeImportDialog.vue'
import LoadError from '@/components/common/LoadError.vue'
import { ERROR_COPY } from '@/constants/error-copy'
import { toUserMessage } from '@/helpers/userError'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { YOUTUBE_COPY } from '@/constants/youtube-copy'
import { useConnectivity } from '@/composables/useConnectivity'
import { useImportsStore } from '@/stores/imports-store'
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
const imports = useImportsStore()
const connectivity = useConnectivity()
const { isOffline, isBrowserOffline } = connectivity
const copy = OFFLINE_COPY
const ytCopy = YOUTUBE_COPY
const search = ref('')
const filterMode = ref('all')
const youtubeDialogOpen = ref(false)
const youtubeEntry = ref(null)
const dropzone = ref(null)
const flashTrackId = ref(null)
let searchTimer = null
/** Duplicate "Open track" highlight */
const FLASH_MS = 1600

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

function openYoutubeDialog() {
  if (isOffline.value) {
    $q.notify({ type: 'warning', message: ytCopy.offlineToast, position: 'top' })
    return
  }
  youtubeDialogOpen.value = true
}

// Optional deep link /library?add=youtube (future share target)
function openYoutubeFromRoute() {
  if (route.query.add !== 'youtube') return
  const query = { ...route.query }
  delete query.add
  router.replace({ name: 'library', query })
  openYoutubeDialog()
}

function restoreEntryFocus() {
  youtubeEntry.value?.$el?.focus()
}

function scrollToImports() {
  document.getElementById('imports')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToTrack(id) {
  document.getElementById(`track-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  flashTrackId.value = id
  setTimeout(() => {
    flashTrackId.value = null
  }, FLASH_MS)
}

function loadLibrary() {
  return library
    .fetchTracks()
    .then(() => offline.backfillCovers(library.tracks))
    .catch(() => {})
}

onMounted(() => {
  syncFilterFromRoute()
  // Offline: land on Downloaded - the cloud library can't load anyway
  if (isOffline.value && filterMode.value !== 'downloaded') setFilter('downloaded')
  offline.hydrate().catch(() => {})
  if (!isBrowserOffline.value) {
    loadLibrary()
    imports.fetch()
    playlists.fetchPlaylists().catch(() => {})
  }
  openYoutubeFromRoute()
})

watch(() => route.query.offline, syncFilterFromRoute)
watch(() => route.query.add, openYoutubeFromRoute)

// Connection dropped: switch to Downloaded. Back online: keep the user's choice,
// just retry a library load that failed while offline.
watch(isOffline, (nowOffline) => {
  if (nowOffline) {
    if (filterMode.value !== 'downloaded') setFilter('downloaded')
  } else if (library.error || !library.tracks.length) {
    loadLibrary()
  }
  imports.syncPolling()
})

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
    $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.like) })
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
      $q.notify({
        type: 'negative',
        message: toUserMessage(err, ERROR_COPY.action.addToPlaylist),
        position: 'top',
      })
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
      $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.deleteTrack) })
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

.yt-entry {
  min-height: 44px;
  padding: 0 18px;
  background: var(--mt-text);
  color: var(--mt-bg);
  font-weight: 600;
}

.yt-entry.is-offline {
  opacity: 0.38;
}

@media (max-width: 599px) {
  .head .search {
    order: 3;
    width: 100%;
  }
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

.empty-dl,
.empty-lib {
  gap: 8px;
}

.empty-actions {
  gap: 12px;
  margin-top: 8px;
}

.empty-upload {
  min-height: 44px;
  color: var(--mt-text);
}

.list > .flash {
  background: var(--mt-accent-soft);
}

.offline-card {
  gap: 8px;
  padding: 28px 20px;
  border: 1px dashed var(--mt-border);
  border-radius: 16px;
  background: var(--mt-bg-panel);
}

.offline-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  margin-bottom: 4px;
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
}

.offline-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--mt-text);
}

.offline-text {
  margin: 0 0 8px;
  color: var(--mt-text-muted);
}

.offline-cta {
  background: var(--mt-accent);
  color: var(--mt-bg);
  font-weight: 600;
  border-radius: 999px;
  padding: 4px 18px;
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
