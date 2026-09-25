<template>
  <div class="player-bar">
    <button
      type="button"
      class="now row items-center"
      :disabled="!player.hasTrack"
      aria-label="Open now playing"
      @click="player.openSheet()"
    >
      <div class="cover flex flex-center" :class="{ live: player.hasTrack }">
        <img v-if="player.coverUrl" :src="player.coverUrl" alt="" />
        <q-icon v-else :name="player.hasTrack ? 'graphic_eq' : 'music_note'" size="22px" />
        <span
          v-if="player.currentTrack && offline.isDownloaded(player.currentTrack.id)"
          class="offline-dot"
          aria-hidden="true"
        />
      </div>
      <div class="meta ellipsis">
        <div class="title ellipsis">{{ player.displayTitle }}</div>
        <div class="artist ellipsis">{{ player.displayArtist }}</div>
      </div>
    </button>

    <div class="transport column items-center">
      <div class="row items-center q-gutter-sm">
        <q-btn
          flat
          round
          dense
          icon="shuffle"
          class="ghost"
          :class="{ on: player.shuffle }"
          size="sm"
          :aria-label="player.shuffle ? 'Disable shuffle' : 'Enable shuffle'"
          :aria-pressed="player.shuffle ? 'true' : 'false'"
          :disable="!player.hasTrack || player.queue.length < 2"
          @click="player.toggleShuffle()"
        />
        <q-btn
          flat
          round
          dense
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
          dense
          icon="skip_next"
          class="ghost"
          aria-label="Next track"
          :disable="!player.hasTrack || (player.queue.length < 2 && player.repeat !== 'all')"
          @click="player.playNext()"
        />
        <q-btn
          flat
          round
          dense
          :icon="player.repeat === 'one' ? 'repeat_one' : 'repeat'"
          class="ghost"
          :class="{ on: player.repeat !== 'off' }"
          size="sm"
          :aria-label="repeatAria"
          @click="player.cycleRepeat()"
        />
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
      <div v-if="player.error" class="err">{{ player.error }}</div>
    </div>

    <div class="extras row items-center justify-end q-gutter-sm gt-xs">
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

    <div class="mini-progress lt-sm" aria-hidden="true">
      <div class="mini-fill" :style="{ width: `${player.progressPct}%` }" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { usePlayerStore } from '@/stores/player-store'
import { useOfflineStore } from '@/stores/offline-store'
import { useConnectivity } from '@/composables/useConnectivity'
import { useLikesStore } from '@/stores/likes-store'
import { formatDuration } from '@/helpers/mediaUrl'

const $q = useQuasar()
const player = usePlayerStore()
const offline = useOfflineStore()
const connectivity = useConnectivity()
const likes = useLikesStore()

const repeatAria = computed(() => {
  if (player.repeat === 'one') return 'Repeat one'
  if (player.repeat === 'all') return 'Repeat all'
  return 'Repeat off'
})

onMounted(() => {
  player.bindAudioEvents()
})

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
.player-bar {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr;
  align-items: center;
  gap: 16px;
  height: var(--mt-player);
  padding: 0 18px;
  background: rgba(12, 14, 20, 0.88);
  backdrop-filter: blur(20px) saturate(1.2);
  border-top: 1px solid var(--mt-border);
}

[data-theme='light'] .player-bar {
  background: rgba(255, 255, 255, 0.9);
}

@media (max-width: 599px) {
  .player-bar {
    grid-template-columns: 1fr auto;
    height: 72px;
  }

  .transport .scrub {
    display: none;
  }
}

.now {
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
}

.now:disabled {
  cursor: default;
}

.now:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--mt-accent-soft);
}

.cover {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
  flex-shrink: 0;
  transition: box-shadow 240ms var(--ease-out);
}

[data-theme='light'] .cover {
  background: linear-gradient(145deg, #e8e6df, #f0eee8);
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover.live {
  color: var(--mt-accent);
  box-shadow: 0 0 24px rgba(61, 255, 181, 0.2);
}

.meta {
  min-width: 0;
}

.title {
  font-weight: 600;
  font-size: 0.92rem;
}

.artist {
  color: var(--mt-text-muted);
  font-size: 0.78rem;
}

.transport {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

.play-btn {
  width: 42px;
  height: 42px;
  background: var(--mt-text) !important;
  color: var(--mt-bg) !important;
  transition: transform 160ms var(--ease-out);
}

.play-btn:hover:not(.disabled) {
  transform: scale(1.06);
}

.play-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--mt-accent-soft);
}

.ghost {
  color: var(--mt-text-muted) !important;
}

.ghost.on {
  color: var(--mt-accent) !important;
}

.ghost-icon {
  color: var(--mt-text-muted);
}

.scrub {
  gap: 10px;
  margin-top: 4px;
  font-size: 0.68rem;
  color: var(--mt-text-dim);
  font-variant-numeric: tabular-nums;
}

.track {
  flex: 1;
  height: 4px;
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
  transition: width 80ms linear;
}

.err {
  margin-top: 2px;
  font-size: 0.65rem;
  color: #ff8f8f;
}

.vol-range {
  width: 96px;
  accent-color: var(--mt-accent);
}

.like-btn {
  color: var(--mt-text-dim) !important;
}

.like-btn.on {
  color: var(--mt-warm) !important;
}

.mini-progress {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

[data-theme='light'] .mini-progress {
  background: rgba(12, 14, 20, 0.08);
}

.mini-fill {
  height: 100%;
  background: var(--mt-accent);
}

@media (prefers-reduced-motion: reduce) {
  .play-btn,
  .cover {
    transition: none;
  }
}

.offline-dot {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mt-accent);
  box-shadow: 0 0 0 2px rgba(7, 8, 12, 0.85);
}

</style>
