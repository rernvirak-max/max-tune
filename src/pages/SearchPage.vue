<template>
  <q-page class="mt-page page">
    <header class="head">
      <h1 class="mt-display">Search</h1>
      <p class="sub">Your library, Jamendo, and YouTube</p>
    </header>

    <div class="tabs row q-gutter-sm q-mb-md">
      <button type="button" class="tab" :class="{ on: tab === 'library' }" @click="tab = 'library'">
        Library
      </button>
      <button type="button" class="tab" :class="{ on: tab === 'jamendo' }" @click="tab = 'jamendo'">
        Jamendo
      </button>
      <button type="button" class="tab" :class="{ on: tab === 'youtube' }" @click="tab = 'youtube'">
        YouTube
      </button>
    </div>

    <div class="search-wrap">
      <q-icon name="search" size="22px" class="icon" />
      <input
        v-model="q"
        class="search-input"
        type="search"
        :placeholder="placeholder"
        @keydown.enter.prevent="runSearch"
      />
    </div>

    <div v-if="loading" class="state">Searching…</div>
    <LoadError v-else-if="error" :message="error" @retry="runSearch" />
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

    <div v-else-if="tab === 'jamendo' && results.length" class="list">
      <div v-for="item in results" :key="item.external_id" class="catalog-row row items-center">
        <div class="cover flex flex-center">
          <img
            v-if="item.cover_url && !isBrokenImage(item.cover_url)"
            :src="item.cover_url"
            alt=""
            @error="markBrokenImage(item.cover_url)"
          />
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
          @click="previewJamendo(item)"
        />
        <q-btn
          unelevated
          no-caps
          dense
          class="import"
          :disable="item.imported || importingId === item.external_id"
          :label="item.imported ? 'In library' : 'Add'"
          @click="importJamendo(item)"
        />
      </div>
    </div>

    <div v-else-if="tab === 'youtube' && results.length" class="list">
      <div v-for="item in results" :key="item.external_id" class="catalog-row row items-center">
        <div class="cover flex flex-center">
          <img
            v-if="item.cover_url && !isBrokenImage(item.cover_url)"
            :src="item.cover_url"
            alt=""
            @error="markBrokenImage(item.cover_url)"
          />
          <q-icon v-else name="smart_display" size="22px" />
        </div>
        <div class="meta col ellipsis">
          <div class="title ellipsis">{{ item.title }}</div>
          <div class="artist ellipsis">{{ item.artist_name || 'YouTube' }}</div>
        </div>
        <div class="duration gt-xs">{{ formatDuration(item.duration_ms) }}</div>
        <q-btn
          unelevated
          no-caps
          dense
          class="import"
          :disable="item.imported || item.importing || importingId === item.external_id"
          :label="youtubeAddLabel(item)"
          @click="importYoutube(item)"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import TrackRow from '@/components/library/TrackRow.vue'
import LoadError from '@/components/common/LoadError.vue'
import { ERROR_COPY } from '@/constants/error-copy'
import { isBrokenImage, markBrokenImage } from '@/helpers/brokenImages'
import { formatDuration } from '@/helpers/mediaUrl'
import { toUserMessage } from '@/helpers/userError'
import { importJamendoTrack, searchJamendo, searchYoutube } from '@/services/engine/catalog'
import { listTracks } from '@/services/engine/tracks'
import { useImportsStore } from '@/stores/imports-store'
import { useLibraryStore } from '@/stores/library-store'
import { useLikesStore } from '@/stores/likes-store'
import { usePlayerStore } from '@/stores/player-store'
import { usePlaylistStore } from '@/stores/playlist-store'

const $q = useQuasar()
const router = useRouter()
const imports = useImportsStore()
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

const placeholder = computed(() => {
  if (tab.value === 'library') return 'Search your tracks…'
  if (tab.value === 'jamendo') return 'Search Jamendo catalog…'
  return 'Search YouTube…'
})

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
    } else if (tab.value === 'jamendo') {
      const data = await searchJamendo({ q: query, limit: 24 })
      results.value = data.data || []
    } else {
      const data = await searchYoutube({ q: query, limit: 24 })
      results.value = data.data || []
    }
  } catch (err) {
    results.value = []
    error.value = toUserMessage(err, ERROR_COPY.load.search, {
      context: 'search',
      allowServerMessage: tab.value !== 'library',
    })
  } finally {
    loading.value = false
  }
}

function playLibrary(index) {
  player.playQueue(results.value, index)
}

function previewJamendo(item) {
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

function youtubeAddLabel(item) {
  if (item.imported) return 'In library'
  if (item.importing || importingId.value === item.external_id) return 'Queued'
  return 'Download'
}

async function importJamendo(item) {
  importingId.value = item.external_id
  try {
    const track = await importJamendoTrack(item.external_id)
    item.imported = true
    library.tracks.unshift(track)
    $q.notify({ type: 'positive', message: 'Added to library', position: 'top' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: toUserMessage(err, ERROR_COPY.action.importTrack),
      position: 'top',
    })
  } finally {
    importingId.value = null
  }
}

async function importYoutube(item) {
  importingId.value = item.external_id
  try {
    await imports.submit(item.watch_url)
    item.importing = true
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: toUserMessage(err, ERROR_COPY.action.importTrack, {
        allowServerMessage: true,
      }),
      position: 'top',
    })
  } finally {
    importingId.value = null
  }
}

async function onLike(track) {
  try {
    await likes.toggle(track)
  } catch (err) {
    $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.like) })
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
      $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.addToPlaylist) })
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
      $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.deleteTrack) })
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
