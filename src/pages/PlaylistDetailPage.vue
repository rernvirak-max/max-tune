<template>
  <q-page class="mt-page page">
    <div v-if="store.detailLoading" class="state">Loading…</div>
    <div v-else-if="!playlist" class="state error">{{ store.error || 'Playlist not found' }}</div>
    <template v-else>
      <header class="head">
        <q-btn
          flat
          dense
          no-caps
          icon="arrow_back"
          label="Playlists"
          class="back"
          :to="{ name: 'playlists' }"
        />
        <div class="hero row items-end q-gutter-lg">
          <div class="cover flex flex-center">
            <img v-if="coverSrc" :src="coverSrc" :alt="playlist.title" />
            <q-icon v-else name="queue_music" size="48px" />
          </div>
          <div class="col">
            <p class="eyebrow">Playlist</p>
            <h1 class="mt-display">{{ playlist.title }}</h1>
            <p v-if="playlist.description" class="desc">{{ playlist.description }}</p>
            <p class="meta">
              {{ playlist.track_count || 0 }}
              {{ playlist.track_count === 1 ? 'track' : 'tracks' }}
            </p>
            <div class="row q-gutter-sm q-mt-md">
              <q-btn
                unelevated
                no-caps
                class="play-all"
                icon="play_arrow"
                label="Play"
                :disable="!tracks.length"
                @click="playAll"
              />
              <q-btn flat round dense icon="edit" class="ghost" @click="rename" />
              <q-btn flat round dense icon="delete_outline" class="ghost danger" @click="remove" />
            </div>
          </div>
        </div>
      </header>

      <div v-if="!tracks.length" class="empty">
        No tracks yet — open Library and use “Add to playlist”.
      </div>
      <div v-else class="list">
        <TrackRow
          v-for="(track, index) in tracks"
          :key="track.id"
          :track="track"
          remove-icon="remove_circle_outline"
          @play="playFrom(index)"
          @like="onLike"
          @remove="onDetach(track)"
        />
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import TrackRow from '@/components/library/TrackRow.vue'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'
import { usePlaylistStore } from '@/stores/playlist-store'
import { usePlayerStore } from '@/stores/player-store'
import { useLikesStore } from '@/stores/likes-store'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const store = usePlaylistStore()
const player = usePlayerStore()
const likes = useLikesStore()

const playlist = computed(() => store.current)
const tracks = computed(() => playlist.value?.tracks || [])
const coverSrc = computed(() => toEngineProxyUrl(playlist.value?.cover_url))

async function load() {
  await store.fetchPlaylist(route.params.id)
}

onMounted(load)
watch(() => route.params.id, load)

function playAll() {
  player.playQueue(tracks.value, 0)
}

function playFrom(index) {
  player.playQueue(tracks.value, index)
}

async function onLike(track) {
  try {
    await likes.toggle(track)
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.message || 'Could not update like' })
  }
}

function rename() {
  if (!playlist.value) return
  $q.dialog({
    title: 'Rename playlist',
    prompt: {
      model: playlist.value.title,
      type: 'text',
      outlined: true,
      dark: true,
    },
    cancel: true,
    persistent: true,
    dark: true,
  }).onOk(async (title) => {
    const trimmed = String(title || '').trim()
    if (!trimmed) return
    try {
      await store.update(playlist.value.id, { title: trimmed })
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.message || 'Rename failed' })
    }
  })
}

function remove() {
  if (!playlist.value) return
  $q.dialog({
    title: 'Delete playlist?',
    message: `Remove “${playlist.value.title}”? Tracks stay in your library.`,
    cancel: true,
    persistent: true,
    dark: true,
  }).onOk(async () => {
    try {
      await store.remove(playlist.value.id)
      router.push({ name: 'playlists' })
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.message || 'Delete failed' })
    }
  })
}

function onDetach(track) {
  $q.dialog({
    title: 'Remove from playlist?',
    message: `Take “${track.title}” out of this playlist?`,
    cancel: true,
    dark: true,
  }).onOk(async () => {
    try {
      await store.removeTrack(playlist.value.id, track.id)
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.message || 'Remove failed' })
    }
  })
}
</script>

<style scoped>
.page {
  padding: 28px 36px 48px;
  max-width: 1100px;
}

@media (max-width: 599px) {
  .page {
    padding: 20px 18px 40px;
  }
}

.back {
  color: var(--mt-text-muted) !important;
  margin-bottom: 18px;
}

.hero {
  margin-bottom: 28px;
}

.cover {
  width: 180px;
  height: 180px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
  flex-shrink: 0;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
}

@media (max-width: 599px) {
  .cover {
    width: 120px;
    height: 120px;
  }
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  color: var(--mt-text-dim);
}

h1 {
  margin: 6px 0 0;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
}

.desc,
.meta {
  margin: 8px 0 0;
  color: var(--mt-text-muted);
}

.play-all {
  background: var(--mt-accent) !important;
  color: #07080c !important;
  border-radius: 999px;
  padding: 0 18px;
  font-weight: 600;
}

.ghost {
  color: var(--mt-text-muted) !important;
}

.danger:hover {
  color: #ff8f8f !important;
}

.state,
.empty {
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
