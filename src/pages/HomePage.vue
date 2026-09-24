<template>
  <q-page class="mt-page home">
    <header class="hero">
      <p class="eyebrow">Good {{ greeting }}, {{ firstName }}</p>
      <h1 class="mt-display">Your sound, privately yours</h1>
      <p class="lede">
        Your private room is ready.
        <router-link class="inline-link" :to="{ name: 'library' }">Upload tracks</router-link>
        or jump into
        <router-link class="inline-link" :to="{ name: 'liked' }">Liked songs</router-link>.
      </p>
    </header>

    <section class="shelf">
      <div class="shelf-head row items-end justify-between">
        <h2 class="mt-display">Jump back in</h2>
        <span class="hint">{{ likes.count ? `${likes.count} liked` : 'Start with a heart' }}</span>
      </div>

      <div class="rail">
        <router-link
          v-for="tile in tiles"
          :key="tile.title"
          :to="tile.to"
          class="tile"
          :class="{ muted: tile.disabled }"
        >
          <div class="mt-empty-art" :style="tile.artStyle" />
          <div class="tile-meta">
            <div class="tile-title">{{ tile.title }}</div>
            <div class="tile-sub">{{ tile.sub }}</div>
          </div>
        </router-link>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth-store'
import { useLikesStore } from '@/stores/likes-store'
import { useLibraryStore } from '@/stores/library-store'

const auth = useAuthStore()
const likes = useLikesStore()
const library = useLibraryStore()

const firstName = computed(() => (auth.user?.name || 'listener').split(/\s+/)[0])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
})

onMounted(() => {
  likes.fetchLiked().catch(() => {})
  if (!library.tracks.length) {
    library.fetchTracks().catch(() => {})
  }
})

const tiles = computed(() => [
  {
    title: 'Library',
    sub: library.trackCount ? `${library.trackCount} tracks` : 'Upload to start',
    to: { name: 'library' },
    disabled: false,
    artStyle: {
      background:
        'radial-gradient(circle at 30% 25%, rgba(61,255,181,.4), transparent 45%), linear-gradient(145deg,#1a2332,#0c0e14)',
    },
  },
  {
    title: 'Liked songs',
    sub: likes.count ? `${likes.count} hearts` : 'Nothing liked yet',
    to: { name: 'liked' },
    disabled: false,
    artStyle: {
      background:
        'radial-gradient(circle at 70% 30%, rgba(255,122,69,.45), transparent 42%), linear-gradient(145deg,#2a1520,#0c0e14)',
    },
  },
  {
    title: 'Playlists',
    sub: 'Stacks for moods',
    to: { name: 'playlists' },
    disabled: false,
    artStyle: {
      background:
        'radial-gradient(circle at 40% 60%, rgba(61,200,255,.35), transparent 48%), linear-gradient(145deg,#141828,#0c0e14)',
    },
  },
])
</script>

<style scoped>
.home {
  padding: 36px 36px 48px;
  max-width: 1100px;
}

@media (max-width: 599px) {
  .home {
    padding: 24px 18px 40px;
  }
}

.hero {
  margin-bottom: 40px;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--mt-accent);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4.5vw, 3.1rem);
  line-height: 1.05;
  max-width: 14ch;
}

.lede {
  margin: 16px 0 0;
  max-width: 42ch;
  color: var(--mt-text-muted);
  font-size: 1.05rem;
  line-height: 1.55;
}

.inline-link {
  color: var(--mt-accent);
  text-decoration: none;
  font-weight: 600;
}

.inline-link:hover {
  text-decoration: underline;
}

.shelf-head {
  margin-bottom: 18px;
  gap: 12px;
}

.shelf-head h2 {
  margin: 0;
  font-size: 1.35rem;
}

.hint {
  color: var(--mt-text-dim);
  font-size: 0.8rem;
}

.rail {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 900px) {
  .rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .rail {
    grid-template-columns: 1fr;
  }
}

.tile {
  text-align: left;
  text-decoration: none;
  color: inherit;
  display: block;
  padding: 12px;
  border-radius: 16px;
  background: var(--mt-bg-panel);
  transition:
    background 200ms var(--ease-out),
    transform 200ms var(--ease-out);
}

.tile:hover {
  background: var(--mt-bg-panel-hover);
  transform: translateY(-2px);
}

.tile-meta {
  margin-top: 12px;
  padding: 0 2px 4px;
}

.tile-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.tile-sub {
  margin-top: 4px;
  color: var(--mt-text-muted);
  font-size: 0.8rem;
}
</style>
