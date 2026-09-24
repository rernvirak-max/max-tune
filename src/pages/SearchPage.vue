<template>
  <q-page class="mt-page page">
    <header class="head">
      <h1 class="mt-display">Search</h1>
      <p class="sub">Your library and Creative Commons catalog</p>
    </header>

    <div class="tabs row q-gutter-sm q-mb-md">
      <button
        type="button"
        class="tab"
        :class="{ on: tab === 'library' }"
        @click="tab = 'library'"
      >
        Library
      </button>
      <button
        type="button"
        class="tab"
        :class="{ on: tab === 'catalog' }"
        @click="tab = 'catalog'"
      >
        Jamendo
      </button>
    </div>

    <div class="search-wrap">
      <q-icon name="search" size="22px" class="icon" />
      <input
        v-model="q"
        class="search-input"
        type="search"
        :placeholder="tab === 'library' ? 'Search your tracks…' : 'Search Jamendo catalog…'"
        @keydown.enter.prevent="runSearch"
      />
    </div>

    <div v-if="loading" class="state">Searching…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="searched && !results.length" class="state">No matches.</div>

    <div v-else-if="tab === 'library' && results.length" class="list">
      <TrackRow
        v-for="(track, index) in results"
        :key="track.id"
        :track="track"
        show-add
        @play="playLibrary(index)"
        @add="onAdd"
        @like="onLike"
        @remove="onRemove"
      />
    </div>

    <div v-else-if="tab === 'catalog' && results.length" class="list">
      <div v-for="item in results" :key="item.external_id" class="catalog-row row items-center">
        <div class="cover flex flex-center">
          <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" />
          <q-icon v-else name="music_note" size="22px" />
        </div>
        <div class="meta col ellipsis">
          <div class="title ellipsis">{{ item.title }}</div>
          <div class="artist ellipsis">
            {{ item.artist_name || 'Unknown artist' }}
            <span v-if="item.album_name"> · {{ item.album_name }}</span>
          </div>
        </div>
        <div class="duration gt-xs">{{ formatDuration(item.duration_ms) }}</div>
        <q-btn
          flat
          round
          dense
          icon="play_arrow"
          class="play"
          :disable="!item.stream_url"
          @click="previewCatalog(item)"
        />
        <q-btn
          unelevated
          no-caps
          dense
          class="import"
          :disable="item.imported || importingId === item.external_id"
          :label="item.imported ? 'In library' : 'Add'"
          @click="importItem(item)"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import TrackRow from '@/components/library/TrackRow.vue'
import { formatDuration } from '@/helpers/mediaUrl'
import { importJamendoTrack, searchJamendo } from '@/services/engine/catalog'
import { listTracks } from '@/services/engine/tracks'
import { useLibraryStore } from '@/stores/library-store'
import { useLikesStore } from '@/stores/likes-store'
import { usePlayerStore } from '@/stores/player-store'
import { usePlaylistStore } from '@/stores/playlist-store'

const $q = useQuasar()
const router = useRouter()
const library = useLibraryStore()
const likes = useLikesStore()
const player = usePlayerStore()
const playlists = usePlaylistStore()

const tab = ref('library')
const q = ref('')
const results = ref([])
const loading = ref(false)
const error = ref(null)
const searched = ref(false)
const importingId = ref(null)
let timer = null

watch(tab, () => {
  results.value = []
  searched.value = false
  error.value = null
  if (q.value.trim()) runSearch()
})

watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (q.value.trim().length >= 2) runSearch()
  }, 320)
})

async function runSearch() {
  const query = q.value.trim()
  if (!query) {
    results.value = []
    searched.value = false
    return
  }

  loading.value = true
  error.value = null
  searched.value = true

  try {
    if (tab.value === 'library') {
      const data = await listTracks({ q: query, per_page: 50 })
      results.value = data.data || []
    } else {
      const data = await searchJamendo({ q: query, limit: 24 })
      results.value = data.data || []
    }
  } catch (err) {
    results.value = []
    error.value = err?.message || 'Search failed'
  } finally {
    loading.value = false
  }
}

function playLibrary(index) {
  player.playQueue(results.value, index)
}

function previewCatalog(item) {
  player.playTrack({
    id: `jamendo-${item.external_id}`,
    title: item.title,
    artist_name: item.artist_name,
    album_name: item.album_name,
    duration_ms: item.duration_ms,
    cover_url: item.cover_url,
    stream_url: item.stream_url,
    liked: false,
    source: 'jamendo',
  })
}

async function importItem(item) {
  importingId.value = item.external_id
  try {
    const track = await importJamendoTrack(item.external_id)
    item.imported = true
    library.tracks.unshift(track)
    $q.notify({ type: 'positive', message: 'Added to library', position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.message || 'Import failed', position: 'top' })
  } finally {
    importingId.value = null
  }
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
      message: 'Create a playlist first.',
      ok: { label: 'Go to Playlists' },
      cancel: true,
      dark: true,
    }).onOk(() => router.push({ name: 'playlists' }))
    return
  }

  $q.dialog({
    title: 'Add to playlist',
    options: {
      type: 'radio',
      model: playlists.playlists[0].id,
      items: playlists.playlists.map((p) => ({ label: p.title, value: p.id })),
    },
    cancel: true,
    dark: true,
    ok: { label: 'Add' },
  }).onOk(async (playlistId) => {
    try {
      await playlists.addTrack(playlistId, track.id)
      $q.notify({ type: 'positive', message: 'Added to playlist', position: 'top' })
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.message || 'Could not add' })
    }
  })
}

async function onRemove(track) {
  $q.dialog({
    title: 'Remove track?',
    message: `Delete “${track.title}” from your library?`,
    cancel: true,
    dark: true,
  }).onOk(async () => {
    try {
      await library.removeTrack(track.id)
      results.value = results.value.filter((t) => t.id !== track.id)
      if (player.currentTrack?.id === track.id) player.clear()
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.message || 'Delete failed' })
    }
  })
}
</script>

<style scoped>
.page {
  padding: 36px 36px 48px;
  max-width: 900px;
}

@media (max-width: 599px) {
  .page {
    padding: 24px 18px 40px;
  }
}

.head {
  margin-bottom: 20px;
}

h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
}

.sub {
  margin: 8px 0 0;
  color: var(--mt-text-muted);
}

.tab {
  border: 1px solid var(--mt-border);
  background: transparent;
  color: var(--mt-text-muted);
  border-radius: 999px;
  padding: 6px 14px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.tab.on {
  color: #07080c;
  background: var(--mt-accent);
  border-color: transparent;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.icon {
  position: absolute;
  left: 18px;
  color: var(--mt-text-dim);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 56px;
  padding: 0 18px 0 52px;
  border: 1px solid var(--mt-border);
  border-radius: 999px;
  background: var(--mt-bg-panel);
  color: var(--mt-text);
  font: inherit;
  font-size: 1.05rem;
  outline: none;
}

.search-input:focus {
  border-color: rgba(61, 255, 181, 0.45);
  box-shadow: 0 0 0 4px var(--mt-accent-soft);
}

.state {
  padding: 20px 8px;
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

.catalog-row {
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
}

.catalog-row:hover {
  background: var(--mt-bg-panel-hover);
}

.cover {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
  flex-shrink: 0;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.title {
  font-weight: 600;
  font-size: 0.95rem;
}

.artist {
  margin-top: 2px;
  color: var(--mt-text-muted);
  font-size: 0.8rem;
}

.duration {
  color: var(--mt-text-dim);
  font-variant-numeric: tabular-nums;
  font-size: 0.82rem;
  min-width: 48px;
  text-align: right;
}

.play {
  color: var(--mt-accent) !important;
}

.import {
  background: var(--mt-accent-soft) !important;
  color: var(--mt-accent) !important;
  border-radius: 999px;
  padding: 0 12px;
  min-height: 32px;
}
</style>
