<template>
  <div
    class="track-row row items-center"
    :class="{ playing: isPlaying }"
    @dblclick="$emit('play', track)"
  >
    <div class="cover flex flex-center">
      <img v-if="coverSrc" :src="coverSrc" :alt="track.title" />
      <q-icon v-else name="music_note" size="22px" />
    </div>

    <div class="meta col ellipsis">
      <div class="title ellipsis">{{ track.title }}</div>
      <div class="artist ellipsis">
        {{ track.artist_name || 'Unknown artist' }}
        <span v-if="track.album_name"> · {{ track.album_name }}</span>
      </div>
    </div>

    <div class="duration gt-xs">{{ formatDuration(track.duration_ms) }}</div>

    <q-btn
      flat
      round
      dense
      :icon="track.liked ? 'favorite' : 'favorite_border'"
      class="like"
      :class="{ on: track.liked }"
      :aria-label="track.liked ? 'Unlike' : 'Like'"
      @click.stop="$emit('like', track)"
    />

    <div class="offline-ctrl flex flex-center gt-xs" @click.stop>
      <q-circular-progress
        v-if="dlProgress?.status === 'downloading'"
        :value="dlProgress.pct || 0"
        size="22px"
        :thickness="0.22"
        color="primary"
        track-color="grey-9"
        class="offline-progress"
        :aria-label="pctLabel"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="dlProgress.pct || 0"
        aria-busy="true"
      >
        <q-tooltip>{{ pctLabel }}</q-tooltip>
      </q-circular-progress>
      <q-btn
        v-else-if="isAvailable"
        flat
        round
        dense
        icon="download_done"
        class="offline available"
        :aria-label="copy.state.available"
        @click="onOfflineClick"
      >
        <q-tooltip>{{ copy.state.available }}</q-tooltip>
      </q-btn>
      <q-btn
        v-else-if="dlProgress?.status === 'error'"
        flat
        round
        dense
        icon="error_outline"
        class="offline error"
        :aria-label="copy.err.downloadFail"
        @click="onOfflineClick"
      >
        <q-tooltip>{{ copy.err.downloadFail }}</q-tooltip>
      </q-btn>
      <q-btn
        v-else
        flat
        round
        dense
        icon="download"
        class="offline"
        :class="{ dim: !canDownload }"
        :disable="!canDownload"
        :aria-label="canDownload ? copy.action.makeOffline : copy.err.linked"
        @click="onOfflineClick"
      >
        <q-tooltip>{{ canDownload ? copy.action.makeOffline : copy.err.linked }}</q-tooltip>
      </q-btn>
    </div>

    <q-btn
      flat
      round
      dense
      icon="play_arrow"
      class="play"
      aria-label="Play"
      @click.stop="$emit('play', track)"
    />
    <q-btn
      v-if="showAdd"
      flat
      round
      dense
      icon="playlist_add"
      class="add gt-xs"
      aria-label="Add to playlist"
      @click.stop="$emit('add', track)"
    >
      <q-tooltip>Add to playlist</q-tooltip>
    </q-btn>
    <q-btn
      v-if="showRemove"
      flat
      round
      dense
      :icon="removeIcon"
      class="danger gt-xs"
      aria-label="Remove"
      @click.stop="$emit('remove', track)"
    />
    <q-btn
      flat
      round
      dense
      icon="more_vert"
      class="more lt-sm"
      aria-label="More actions"
      @click.stop
    >
      <q-menu dark anchor="bottom right" self="top right">
        <q-list dark class="mt-menu">
          <q-item
            v-close-popup
            clickable
            :disable="!canDownload || dlProgress?.status === 'downloading'"
            @click="onOfflineClick"
          >
            <q-item-section avatar>
              <q-icon :name="isAvailable ? 'download_done' : 'download'" />
            </q-item-section>
            <q-item-section>{{ offlineMenuLabel }}</q-item-section>
          </q-item>
          <q-item v-if="showAdd" v-close-popup clickable @click="$emit('add', track)">
            <q-item-section avatar><q-icon name="playlist_add" /></q-item-section>
            <q-item-section>Add to playlist</q-item-section>
          </q-item>
          <q-item v-if="showRemove" v-close-popup clickable @click="$emit('remove', track)">
            <q-item-section avatar><q-icon :name="removeIcon" /></q-item-section>
            <q-item-section>Remove</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { formatDuration, toEngineProxyUrl } from '@/helpers/mediaUrl'
import { useOfflineStore } from '@/stores/offline-store'
import { usePlayerStore } from '@/stores/player-store'

const props = defineProps({
  track: { type: Object, required: true },
  showAdd: { type: Boolean, default: false },
  showRemove: { type: Boolean, default: true },
  removeIcon: { type: String, default: 'delete_outline' },
})

defineEmits(['play', 'remove', 'add', 'like'])

const $q = useQuasar()
const player = usePlayerStore()
const offline = useOfflineStore()
const copy = OFFLINE_COPY

const coverSrc = computed(() => toEngineProxyUrl(props.track.cover_url))
const isPlaying = computed(() => player.currentTrack?.id === props.track.id)
const canDownload = computed(() => offline.isDownloadable(props.track))
const isAvailable = computed(() => offline.isDownloaded(props.track.id))
const dlProgress = computed(() => offline.getProgress(props.track.id))
const pctLabel = computed(() => {
  const pct = dlProgress.value?.pct
  if (pct == null || pct === 0) return copy.state.downloading
  return copy.state.downloadingPct(pct)
})
const offlineMenuLabel = computed(() => {
  if (isAvailable.value) return copy.action.removeDownload
  if (!canDownload.value) return copy.err.linked
  return copy.action.makeOffline
})

async function onOfflineClick() {
  if (!canDownload.value) return

  if (isAvailable.value) {
    $q.dialog({
      title: copy.action.removeDownload,
      message: `Remove offline copy of “${props.track.title}”? Your library in the cloud is unchanged.`,
      cancel: true,
      persistent: true,
      dark: true,
      ok: { label: copy.action.removeDownload, color: 'negative', flat: false },
    }).onOk(async () => {
      await offline.removeTrack(props.track.id)
    })
    return
  }

  await offline.downloadTrack(props.track)
}
</script>

<style scoped>
.track-row {
  --tap-target: 44px;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 160ms var(--ease-out);
  position: relative;
}

.track-row:hover {
  background: var(--mt-bg-panel-hover);
}

.track-row.playing {
  background: var(--mt-accent-soft);
}

.track-row.playing::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: var(--mt-accent);
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

[data-theme='light'] .cover {
  background: linear-gradient(145deg, #e8e6df, #f0eee8);
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

.playing .title {
  color: var(--mt-accent);
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

.like {
  color: var(--mt-text-dim) !important;
}

.like.on {
  color: var(--mt-warm) !important;
}

.offline-ctrl {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.offline {
  color: var(--mt-text-dim) !important;
  min-width: 40px;
  min-height: 40px;
}

.offline.available {
  color: var(--mt-accent) !important;
}

.offline.error {
  color: #ff8f8f !important;
}

.offline.dim {
  opacity: 0.4;
}

.offline-progress {
  color: var(--mt-accent);
}

.play {
  color: var(--mt-accent) !important;
}

.add {
  color: var(--mt-text-muted) !important;
}

.danger {
  color: var(--mt-text-dim) !important;
}

.danger:hover {
  color: #ff8f8f !important;
}

.more {
  color: var(--mt-text-muted) !important;
}

.mt-menu {
  background: var(--mt-bg-elevated);
  min-width: 200px;
}

@media (max-width: 599px) {
  .like,
  .play,
  .more {
    min-width: var(--tap-target);
    min-height: var(--tap-target);
  }
}

@media (prefers-reduced-motion: reduce) {
  .track-row {
    transition: none;
  }
}
</style>
