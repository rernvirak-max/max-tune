<template>
  <div class="player-bar">
    <div class="now row items-center">
      <div class="cover flex flex-center" :class="{ live: player.hasTrack }">
        <img v-if="player.coverUrl" :src="player.coverUrl" alt="" />
        <q-icon v-else :name="player.hasTrack ? 'graphic_eq' : 'music_note'" size="22px" />
      </div>
      <div class="meta ellipsis">
        <div class="title ellipsis">{{ player.displayTitle }}</div>
        <div class="artist ellipsis">{{ player.displayArtist }}</div>
      </div>
    </div>

    <div class="transport column items-center">
      <div class="row items-center q-gutter-sm">
        <q-btn flat round dense icon="shuffle" disable class="ghost" size="sm" />
        <q-btn
          flat
          round
          dense
          icon="skip_previous"
          class="ghost"
          :disable="!player.hasTrack"
          @click="player.playPrev()"
        />
        <q-btn
          round
          unelevated
          class="play-btn"
          :icon="player.isPlaying ? 'pause' : 'play_arrow'"
          :disable="!player.hasTrack"
          @click="player.togglePlay()"
        />
        <q-btn
          flat
          round
          dense
          icon="skip_next"
          class="ghost"
          :disable="!player.hasTrack || player.queue.length < 2"
          @click="player.playNext()"
        />
        <q-btn flat round dense icon="repeat" disable class="ghost" size="sm" />
      </div>
      <div class="scrub row items-center full-width">
        <span>{{ formatDuration(player.positionMs) }}</span>
        <div class="track" @click="onSeek">
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
        :value="player.volume"
        @input="onVolume"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { usePlayerStore } from '@/stores/player-store'
import { useLikesStore } from '@/stores/likes-store'
import { formatDuration } from '@/helpers/mediaUrl'

const $q = useQuasar()
const player = usePlayerStore()
const likes = useLikesStore()

onMounted(() => {
  player.bindAudioEvents()
})

function onSeek(event) {
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  const pct = ((event.clientX - rect.left) / rect.width) * 100
  player.seekPct(pct)
}

function onVolume(event) {
  player.setVolume(Number(event.target.value))
}

async function onLike() {
  if (!player.currentTrack) return
  try {
    await likes.toggle(player.currentTrack)
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.message || 'Could not update like' })
  }
}
</script>

<style scoped>
.player-bar {
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
}

.cover {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  color: var(--mt-text-dim);
  flex-shrink: 0;
  transition: box-shadow 240ms var(--ease-out);
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
  margin-top: 2px;
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
  color: #07080c !important;
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
</style>
