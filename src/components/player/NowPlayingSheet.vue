<template>
  <q-dialog
    :model-value="player.sheetOpen"
    :maximized="$q.screen.lt.sm"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="onToggle"
  >
    <q-card class="sheet column" :class="{ mobile: $q.screen.lt.sm }">
      <div class="sheet-wash" aria-hidden="true" />

      <div class="sheet-top row items-center">
        <q-btn
          flat
          round
          dense
          icon="keyboard_arrow_down"
          aria-label="Close now playing"
          class="ghost"
          @click="player.closeSheet()"
        />
        <div class="col text-center eyebrow">Now playing</div>
        <div style="width: 40px" />
      </div>

      <div class="sheet-body column items-center col">
        <div class="art flex flex-center" :class="{ live: player.hasTrack }">
          <img v-if="player.coverUrl" :src="player.coverUrl" alt="" />
          <q-icon v-else name="album" size="64px" />
        </div>

        <div class="meta text-center">
          <div class="title">{{ player.displayTitle }}</div>
          <div class="artist">{{ player.displayArtist }}</div>
        </div>

        <div class="scrub row items-center full-width">
          <span>{{ formatDuration(player.positionMs) }}</span>
          <div
            class="track"
            role="slider"
            tabindex="0"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="Math.round(player.progressPct)"
            aria-label="Seek"
            @click="onSeek"
            @keydown.left.prevent="nudge(-5)"
            @keydown.right.prevent="nudge(5)"
          >
            <div class="fill" :style="{ width: `${player.progressPct}%` }" />
          </div>
          <span>{{ formatDuration(player.durationMs || player.currentTrack?.duration_ms) }}</span>
        </div>

        <div class="transport row items-center justify-center q-gutter-md">
          <q-btn flat round dense icon="shuffle" disable class="ghost" size="sm" aria-label="Shuffle (unavailable)" />
          <q-btn
            flat
            round
            icon="skip_previous"
            class="ghost"
            aria-label="Previous track"
            :disable="!player.hasTrack"
            @click="player.playPrev()"
          />
          <q-btn
            round
            unelevated
            class="play-btn"
            :icon="player.isPlaying ? 'pause' : 'play_arrow'"
            :aria-label="player.isPlaying ? 'Pause' : 'Play'"
            :disable="!player.hasTrack"
            @click="player.togglePlay()"
          />
          <q-btn
            flat
            round
            icon="skip_next"
            class="ghost"
            aria-label="Next track"
            :disable="!player.hasTrack || player.queue.length < 2"
            @click="player.playNext()"
          />
          <q-btn flat round dense icon="repeat" disable class="ghost" size="sm" aria-label="Repeat (unavailable)" />
        </div>

        <div class="extras row items-center justify-between full-width">
          <q-btn
            flat
            round
            dense
            :icon="player.currentTrack?.liked ? 'favorite' : 'favorite_border'"
            class="like-btn"
            :class="{ on: player.currentTrack?.liked }"
            :aria-label="player.currentTrack?.liked ? 'Unlike' : 'Like'"
            :disable="!player.hasTrack"
            @click="onLike"
          />
          <div class="vol row items-center q-gutter-sm gt-xs">
            <q-icon name="volume_up" size="18px" class="ghost-icon" />
            <input
              class="vol-range"
              type="range"
              min="0"
              max="1"
              step="0.01"
              aria-label="Volume"
              :value="player.volume"
              @input="onVolume"
            />
          </div>
        </div>


        <div v-if="player.hasTrack" class="offline-actions row justify-center">
          <q-btn
            v-if="offline.isDownloaded(player.currentTrack.id)"
            flat
            no-caps
            dense
            icon="download_done"
            :label="copy.state.available"
            class="offline-btn available"
            :aria-label="copy.state.available"
            @click="onOfflineToggle"
          />
          <q-btn
            v-else-if="offline.isDownloadable(player.currentTrack)"
            flat
            no-caps
            dense
            icon="download"
            :label="copy.action.makeOffline"
            class="offline-btn"
            :aria-label="copy.action.makeOffline"
            :loading="!!offline.getProgress(player.currentTrack.id)"
            @click="onOfflineToggle"
          />
          <q-btn
            v-else
            flat
            no-caps
            dense
            icon="download"
            :label="copy.err.linked"
            class="offline-btn dim"
            disable
            :aria-label="copy.err.linked"
          />
        </div>

        <div v-if="player.error" class="err">{{ player.error }}</div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { usePlayerStore } from '@/stores/player-store'
import { useOfflineStore } from '@/stores/offline-store'
import { OFFLINE_COPY } from '@/constants/offline-copy'
import { useConnectivity } from '@/composables/useConnectivity'
import { useLikesStore } from '@/stores/likes-store'
import { formatDuration } from '@/helpers/mediaUrl'

const $q = useQuasar()
const player = usePlayerStore()
const offline = useOfflineStore()
const copy = OFFLINE_COPY
const connectivity = useConnectivity()
const likes = useLikesStore()

function onToggle(open) {
  if (!open) player.closeSheet()
}

function onSeek(event) {
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  const pct = ((event.clientX - rect.left) / rect.width) * 100
  player.seekPct(pct)
}

function nudge(deltaPct) {
  player.seekPct(Math.min(100, Math.max(0, player.progressPct + deltaPct)))
}

function onVolume(event) {
  player.setVolume(Number(event.target.value))
}


async function onOfflineToggle() {
  const track = player.currentTrack
  if (!track) return
  if (offline.isDownloaded(track.id)) {
    $q.dialog({
      title: copy.action.removeDownload,
      message: `Remove offline copy of "${track.title}"? Your library in the cloud is unchanged.`,
      cancel: true,
      persistent: true,
      dark: true,
      ok: { label: copy.action.removeDownload, color: 'negative' },
    }).onOk(async () => {
      await offline.removeTrack(track.id)
    })
    return
  }
  await offline.downloadTrack(track)
}

async function onLike() {
  if (!player.currentTrack) return
  if (!connectivity.requireOnline()) return
  try {
    await likes.toggle(player.currentTrack)
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.message || 'Could not update like' })
  }
}
</script>

<style scoped>
.sheet {
  position: relative;
  width: min(480px, 100vw);
  max-height: 92vh;
  border-radius: 24px;
  overflow: hidden;
  background: var(--mt-bg-elevated);
  color: var(--mt-text);
  border: 1px solid var(--mt-border);
}

.sheet.mobile {
  width: 100%;
  max-height: 100%;
  border-radius: 0;
  border: none;
  min-height: 100%;
}

.sheet-wash {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 0%, rgba(61, 255, 181, 0.14), transparent 55%),
    radial-gradient(ellipse 70% 45% at 90% 10%, rgba(255, 122, 69, 0.12), transparent 50%);
  z-index: 0;
}

[data-theme='light'] .sheet-wash {
  background:
    radial-gradient(ellipse 80% 50% at 20% 0%, rgba(0, 168, 120, 0.12), transparent 55%),
    radial-gradient(ellipse 70% 45% at 90% 10%, rgba(232, 90, 42, 0.1), transparent 50%);
}

.sheet-top,
.sheet-body {
  position: relative;
  z-index: 1;
}

.sheet-top {
  padding: 12px 12px 0;
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mt-text-muted);
}

.sheet-body {
  padding: 12px 28px 32px;
  gap: 22px;
}

.art {
  width: min(72vw, 320px);
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
  transition: box-shadow 240ms var(--ease-out);
}

[data-theme='light'] .art {
  background: linear-gradient(145deg, #e8e6df, #f6f4ef);
  box-shadow: 0 18px 40px rgba(18, 20, 28, 0.12);
}

.art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.art.live {
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.35),
    0 0 40px rgba(61, 255, 181, 0.22);
}

.meta {
  width: 100%;
}

.title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.artist {
  margin-top: 6px;
  color: var(--mt-text-muted);
  font-size: 0.95rem;
}

.scrub {
  gap: 12px;
  font-size: 0.72rem;
  color: var(--mt-text-dim);
  font-variant-numeric: tabular-nums;
}

.track {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  cursor: pointer;
}

[data-theme='light'] .track {
  background: rgba(12, 14, 20, 0.12);
}

.track:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--mt-accent-soft);
}

.track .fill {
  height: 100%;
  background: var(--mt-accent);
}

.play-btn {
  width: 64px;
  height: 64px;
  background: var(--mt-text) !important;
  color: var(--mt-bg) !important;
  transition: transform 160ms var(--ease-out);
}

.play-btn:hover:not(.disabled) {
  transform: scale(1.06);
}

.ghost {
  color: var(--mt-text-muted) !important;
}

.ghost-icon {
  color: var(--mt-text-muted);
}

.like-btn {
  color: var(--mt-text-dim) !important;
}

.like-btn.on {
  color: var(--mt-warm) !important;
}

.vol-range {
  width: 120px;
  accent-color: var(--mt-accent);
}

.err {
  font-size: 0.75rem;
  color: #ff8f8f;
}

@media (prefers-reduced-motion: reduce) {
  .play-btn {
    transition: none;
  }
}

.offline-actions {
  width: 100%;
}

.offline-btn {
  color: var(--mt-text-muted) !important;
  border-radius: 999px;
}

.offline-btn.available {
  color: var(--mt-accent) !important;
}

.offline-btn.dim {
  opacity: 0.5;
}

</style>
