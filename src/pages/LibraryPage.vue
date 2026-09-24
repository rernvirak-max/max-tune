<template>
  <q-page class="mt-page page">
    <header class="head row items-end justify-between">
      <div>
        <h1 class="mt-display">Library</h1>
        <p class="sub">
          {{ library.trackCount ? `${library.trackCount} tracks` : 'Songs you own — private by default' }}
        </p>
      </div>
      <q-input
        v-model="search"
        dense
        dark
        outlined
        clearable
        placeholder="Filter…"
        class="search"
        @update:model-value="onSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </header>

    <UploadDropzone class="q-mb-lg" @uploaded="onUploaded" />

    <div v-if="library.uploadProgress.length" class="progress q-mb-md">
      <div v-for="(item, i) in library.uploadProgress.slice(0, 5)" :key="i" class="prog-row">
        <span class="ellipsis">{{ item.name }}</span>
        <span :class="item.status">{{ statusLabel(item) }}</span>
      </div>
    </div>

    <div v-if="library.loading" class="state">Loading library…</div>
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
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import UploadDropzone from '@/components/library/UploadDropzone.vue'
import TrackRow from '@/components/library/TrackRow.vue'
import { useLibraryStore } from '@/stores/library-store'
import { usePlayerStore } from '@/stores/player-store'
import { usePlaylistStore } from '@/stores/playlist-store'
import { useLikesStore } from '@/stores/likes-store'

const $q = useQuasar()
const router = useRouter()
const library = useLibraryStore()
const player = usePlayerStore()
const playlists = usePlaylistStore()
const likes = useLikesStore()
const search = ref('')
let searchTimer = null

onMounted(() => {
  library.fetchTracks().catch(() => {})
  playlists.fetchPlaylists().catch(() => {})
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

async function onLike(track) {
  try {
    await likes.toggle(track)
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.message || 'Could not update like' })
  }
}

async function onAdd(track) {
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
  $q.dialog({
    title: 'Remove track?',
    message: `Delete “${track.title}” from your library?`,
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
    return item.pct ? `Uploading ${item.pct}%` : 'Uploading…'
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
  margin-bottom: 28px;
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

.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
