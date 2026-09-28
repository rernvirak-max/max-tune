<template>
  <q-page class="mt-page page">
    <header class="head row items-end justify-between">
      <div>
        <h1 class="mt-display">Playlists</h1>
        <p class="sub">
          {{ store.count ? `${store.count} playlists` : 'Stacks for moods and sessions' }}
        </p>
      </div>
      <q-btn class="cta" outline no-caps icon="add" label="New playlist" @click="openCreate" />
    </header>

    <div v-if="store.loading" class="state">Loading playlists…</div>
    <LoadError
      v-else-if="store.error && !store.playlists.length"
      :message="store.error"
      @retry="load"
    />
    <div v-else-if="store.isEmpty && !store.error" class="empty column items-center text-center">
      <div class="mt-empty-art art" />
      <h2 class="mt-display">Create your first stack</h2>
      <p>Create a stack, then add tracks from your library.</p>
      <q-btn class="cta solid" unelevated no-caps label="Create playlist" @click="openCreate" />
    </div>
    <div v-else class="grid">
      <router-link
        v-for="playlist in store.playlists"
        :key="playlist.id"
        :to="{ name: 'playlist-detail', params: { id: playlist.id } }"
        class="card"
      >
        <div class="cover flex flex-center">
          <img
            v-if="coverOf(playlist) && !isBrokenImage(coverOf(playlist))"
            :src="coverOf(playlist)"
            alt=""
            @error="markBrokenImage(coverOf(playlist))"
          />
          <q-icon v-else name="queue_music" size="36px" />
        </div>
        <div class="meta">
          <div class="title ellipsis">{{ playlist.title }}</div>
          <div class="count">
            {{ playlist.track_count || 0 }}
            {{ playlist.track_count === 1 ? 'track' : 'tracks' }}
          </div>
        </div>
      </router-link>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { usePlaylistStore } from '@/stores/playlist-store'
import { useConnectivity } from '@/composables/useConnectivity'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'
import LoadError from '@/components/common/LoadError.vue'
import { ERROR_COPY } from '@/constants/error-copy'
import { isBrokenImage, markBrokenImage } from '@/helpers/brokenImages'
import { toUserMessage } from '@/helpers/userError'

const $q = useQuasar()
const router = useRouter()
const store = usePlaylistStore()
const connectivity = useConnectivity()

function load() {
  store.fetchPlaylists().catch(() => {})
}

onMounted(load)

function coverOf(playlist) {
  return toEngineProxyUrl(playlist.cover_url)
}

function openCreate() {
  if (!connectivity.requireOnline()) return
  $q.dialog({
    title: 'New playlist',
    prompt: {
      model: '',
      type: 'text',
      label: 'Title',
      outlined: true,
      dark: true,
      attrs: { maxlength: 120 },
    },
    cancel: true,
    persistent: true,
    dark: true,
    ok: { label: 'Create', color: 'primary', flat: false },
  }).onOk(async (title) => {
    const trimmed = String(title || '').trim()
    if (!trimmed) {
      $q.notify({ type: 'negative', message: 'Title is required', position: 'top' })
      return
    }
    try {
      const playlist = await store.create({ title: trimmed })
      $q.notify({ type: 'positive', message: 'Playlist created', position: 'top' })
      router.push({ name: 'playlist-detail', params: { id: playlist.id } })
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: toUserMessage(err, ERROR_COPY.action.createPlaylist),
        position: 'top',
      })
    }
  })
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
  margin-bottom: 36px;
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

.cta {
  color: var(--mt-text) !important;
  border-color: var(--mt-border) !important;
  border-radius: 999px;
  padding: 0 18px;
  font-weight: 600;
}

.cta.solid {
  background: var(--mt-accent) !important;
  color: #07080c !important;
  border: none !important;
  margin-top: 8px;
}

.state {
  padding: 28px 8px;
  color: var(--mt-text-muted);
}

.empty {
  padding: 48px 16px;
  gap: 12px;
  border: 1px dashed var(--mt-border);
  border-radius: 20px;
  background: var(--mt-bg-panel);
}

.art {
  width: 140px;
  margin-bottom: 8px;
  background:
    radial-gradient(circle at 70% 30%, rgba(255, 122, 69, 0.45), transparent 42%),
    linear-gradient(145deg, #2a1520, #0c0e14) !important;
}

h2 {
  margin: 0;
  font-size: 1.4rem;
}

.empty p {
  margin: 0;
  max-width: 36ch;
  color: var(--mt-text-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 18px;
}

.card {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 180ms var(--ease-out);
}

.card:hover {
  transform: translateY(-3px);
}

.cover {
  aspect-ratio: 1;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
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

.count {
  margin-top: 2px;
  color: var(--mt-text-muted);
  font-size: 0.78rem;
}
</style>
