<template>
  <q-page class="mt-page page">
    <div v-if="store.detailLoading" class="state">Loading...</div>
    <LoadError v-else-if="!playlist && store.error" :message="store.error" @retry="load" />
    <div v-else-if="!playlist" class="state">Playlist not found</div>
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
        <div class="hero row no-wrap items-end">
          <div class="cover flex flex-center">
            <img
              v-if="coverSrc && !isBrokenImage(coverSrc)"
              :src="coverSrc"
              alt=""
              @error="markBrokenImage(coverSrc)"
            />
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
            <p v-if="sizeAbout" class="size-about">{{ sizeAbout }}</p>
            <div class="row q-gutter-sm q-mt-md items-center">
              <q-btn
                unelevated
                no-caps
                class="play-all"
                icon="play_arrow"
                label="Play"
                :disable="!tracks.length"
                @click="playAll"
              />
              <q-btn
                outline
                no-caps
                class="dl-playlist"
                :icon="playlistDownloadIcon"
                :label="playlistDownloadLabel"
                :disable="!tracks.length || playlistDownloading"
                :loading="playlistDownloading"
                @click="onDownloadPlaylist"
              />
              <q-btn-dropdown flat round dense icon="more_vert" class="ghost" dropdown-icon="none">
                <q-list dark bordered class="mt-menu">
                  <q-item clickable v-close-popup @click="rename">
                    <q-item-section avatar><q-icon name="edit" /></q-item-section>
                    <q-item-section>Rename</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    :disable="!hasAnyDownloads"
                    @click="onRemoveDownloads"
                  >
                    <q-item-section avatar><q-icon name="download" /></q-item-section>
                    <q-item-section>Remove downloads</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup class="text-negative" @click="remove">
                    <q-item-section avatar><q-icon name="delete_outline" /></q-item-section>
                    <q-item-section>Delete playlist</q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>
            <q-linear-progress
              v-if="playlistDownloading"
              class="dl-bar q-mt-md"
              :value="playlistPct"
              color="primary"
              track-color="grey-9"
              rounded
              size="6px"
              :aria-valuemin="0"
              :aria-valuemax="100"
              :aria-valuenow="Math.round(playlistPct * 100)"
            />
            <p v-if="skipSummary" class="skip-summary">{{ skipSummary }}</p>
          </div>
        </div>
      </header>

      <div v-if="!tracks.length" class="empty">
        No tracks yet - open Library and use "Add to playlist".
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
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import TrackRow from '@/components/library/TrackRow.vue'
import LoadError from '@/components/common/LoadError.vue'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { ERROR_COPY } from '@/constants/error-copy'
import { isBrokenImage, markBrokenImage } from '@/helpers/brokenImages'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'
import { toUserMessage } from '@/helpers/userError'
import { useConnectivity } from '@/composables/useConnectivity'
import { formatStorageBytes, isTrackDownloadable, useOfflineStore } from '@/stores/offline-store'
import { usePlaylistStore } from '@/stores/playlist-store'
import { usePlayerStore } from '@/stores/player-store'
import { useLikesStore } from '@/stores/likes-store'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const store = usePlaylistStore()
const player = usePlayerStore()
const likes = useLikesStore()
const offline = useOfflineStore()
const connectivity = useConnectivity()
const copy = OFFLINE_COPY

const lastSkipCount = ref(0)

const playlist = computed(() => store.current)
const tracks = computed(() => playlist.value?.tracks || [])
const coverSrc = computed(() => toEngineProxyUrl(playlist.value?.cover_url))

const aboutBytes = computed(() => offline.estimatePlaylistBytes(tracks.value))
const sizeAbout = computed(() => {
  if (!tracks.value.length) return ''
  const downloadable = tracks.value.filter(isTrackDownloadable)
  if (!downloadable.length) return ''
  return copy.state.sizeAbout(
    formatStorageBytes(aboutBytes.value || downloadable.reduce((s, t) => s + (t.size || 0), 0)),
  )
})

const job = computed(() => {
  const j = offline.playlistJob
  if (!j) return null
  if (j.playlistId != null && String(j.playlistId) !== String(route.params.id)) return null
  return j
})

const playlistDownloading = computed(() => job.value?.status === 'running')
const playlistPct = computed(() => {
  if (!job.value?.total) return 0
  return job.value.done / job.value.total
})

const allDownloadableCached = computed(() => {
  const dl = tracks.value.filter(isTrackDownloadable)
  if (!dl.length) return false
  return dl.every((t) => offline.isDownloaded(t.id))
})

const hasAnyDownloads = computed(() => tracks.value.some((t) => offline.isDownloaded(t.id)))

const playlistDownloadIcon = computed(() =>
  allDownloadableCached.value ? 'download_done' : 'download',
)

const playlistDownloadLabel = computed(() => {
  if (playlistDownloading.value && job.value) {
    return copy.state.playlistProgress(job.value.done, job.value.total)
  }
  if (allDownloadableCached.value) return copy.state.playlistDone
  return copy.playlist.download
})

const skipSummary = computed(() => {
  const k = lastSkipCount.value || (job.value?.status === 'done' ? job.value.skipped : 0)
  if (!k) return ''
  return copy.state.skippedLink(k)
})

async function load() {
  offline.hydrate().catch(() => {})
  // Failure is rendered from store.error (friendly copy); nothing to rethrow
  await store.fetchPlaylist(route.params.id).catch(() => {})
}

onMounted(load)
watch(() => route.params.id, load)

function playAll() {
  player.playQueue(tracks.value, 0)
}

function playFrom(index) {
  player.playQueue(tracks.value, index)
}

async function onDownloadPlaylist() {
  if (allDownloadableCached.value) return
  const result = await offline.downloadPlaylist(tracks.value, {
    playlistId: route.params.id,
  })
  if (result?.skipped) lastSkipCount.value = result.skipped
}

function onRemoveDownloads() {
  $q.dialog({
    title: 'Remove downloads?',
    message:
      'Deletes offline audio for tracks in this playlist on this device. Cloud library unchanged.',
    cancel: true,
    persistent: true,
    dark: true,
    ok: { label: 'Remove downloads', color: 'negative' },
  }).onOk(async () => {
    await offline.removePlaylistDownloads(tracks.value)
    lastSkipCount.value = 0
    offline.clearPlaylistJob()
  })
}

async function onLike(track) {
  if (!connectivity.requireOnline()) return
  try {
    await likes.toggle(track)
  } catch (err) {
    $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.like) })
  }
}

function rename() {
  if (!connectivity.requireOnline()) return
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
      $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.renamePlaylist) })
    }
  })
}

function remove() {
  if (!connectivity.requireOnline()) return
  if (!playlist.value) return
  $q.dialog({
    title: 'Delete playlist?',
    message: `Remove "${playlist.value.title}"? Tracks stay in your library.`,
    cancel: true,
    persistent: true,
    dark: true,
  }).onOk(async () => {
    try {
      await store.remove(playlist.value.id)
      router.push({ name: 'playlists' })
    } catch (err) {
      $q.notify({ type: 'negative', message: toUserMessage(err, ERROR_COPY.action.deletePlaylist) })
    }
  })
}

function onDetach(track) {
  if (!connectivity.requireOnline()) return
  $q.dialog({
    title: 'Remove from playlist?',
    message: `Take "${track.title}" out of this playlist?`,
    cancel: true,
    dark: true,
  }).onOk(async () => {
    try {
      await store.removeTrack(playlist.value.id, track.id)
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: toUserMessage(err, ERROR_COPY.action.removeFromPlaylist),
      })
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
  gap: 24px;
  margin-bottom: 28px;
}

@media (max-width: 599px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
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
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.desc,
.meta {
  margin: 8px 0 0;
  color: var(--mt-text-muted);
}

.size-about {
  margin: 6px 0 0;
  color: var(--mt-text-dim);
  font-size: 0.82rem;
}

.play-all {
  background: var(--mt-accent) !important;
  color: #07080c !important;
  border-radius: 999px;
  padding: 0 18px;
  font-weight: 600;
}

.dl-playlist {
  color: var(--mt-text) !important;
  border-color: var(--mt-border) !important;
  border-radius: 999px;
  padding: 0 16px;
  font-weight: 600;
}

.dl-bar {
  max-width: 320px;
}

.skip-summary {
  margin: 10px 0 0;
  color: var(--mt-text-dim);
  font-size: 0.82rem;
}

.ghost {
  color: var(--mt-text-muted) !important;
}

.mt-menu {
  background: var(--mt-bg-elevated);
  min-width: 200px;
}

.state,
.empty {
  padding: 28px 8px;
  color: var(--mt-text-muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
