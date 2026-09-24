<template>
  <q-page class="mt-page page">
    <header class="head row items-end justify-between">
      <div>
        <h1 class="mt-display">Liked songs</h1>
        <p class="sub">
          {{ store.count ? `${store.count} liked` : 'Heart tracks to collect them here' }}
        </p>
      </div>
      <q-btn
        unelevated
        no-caps
        class="play-all"
        icon="play_arrow"
        label="Play"
        :disable="!store.tracks.length"
        @click="playAll"
      />
    </header>

    <div v-if="store.loading" class="state">Loading liked songs…</div>
    <div v-else-if="store.error && !store.tracks.length" class="state error">
      {{ store.error }}
    </div>
    <div v-else-if="store.isEmpty" class="empty column items-center text-center">
      <div class="mt-empty-art art" />
      <h2 class="mt-display">Nothing liked yet</h2>
      <p>Tap the heart on any track in your library.</p>
    </div>
    <div v-else class="list">
      <TrackRow
        v-for="(track, index) in store.tracks"
        :key="track.id"
        :track="track"
        :show-remove="false"
        @play="playFrom(index)"
        @like="onLike"
      />
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useQuasar } from 'quasar'
import TrackRow from '@/components/library/TrackRow.vue'
import { useLikesStore } from '@/stores/likes-store'
import { usePlayerStore } from '@/stores/player-store'

const $q = useQuasar()
const store = useLikesStore()
const player = usePlayerStore()

onMounted(() => {
  store.fetchLiked().catch(() => {})
})

function playAll() {
  player.playQueue(store.tracks, 0)
}

function playFrom(index) {
  player.playQueue(store.tracks, index)
}

async function onLike(track) {
  try {
    await store.toggle(track)
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.message || 'Could not update like' })
  }
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

.play-all {
  background: var(--mt-accent) !important;
  color: #07080c !important;
  border-radius: 999px;
  padding: 0 18px;
  font-weight: 600;
}

.state {
  padding: 28px 8px;
  color: var(--mt-text-muted);
}

.state.error {
  color: #ff8f8f;
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

.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
