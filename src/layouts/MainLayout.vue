<template>
  <q-layout view="lHh Lpr lFf" class="mt-shell">
    <q-drawer
      v-model="drawerOpen"
      show-if-above
      bordered
      :width="240"
      class="mt-sidebar"
    >
      <div class="mt-sidebar-inner column full-height">
        <router-link :to="{ name: 'home' }" class="mt-brand row items-center no-underline">
          <span class="mt-brand-mark" aria-hidden="true" />
          <span class="mt-display mt-brand-name">MaxTune</span>
        </router-link>

        <nav class="mt-nav column q-gutter-y-xs q-mt-lg">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            class="mt-nav-link row items-center"
            :class="{ active: $route.name === item.name }"
          >
            <q-icon :name="item.icon" size="22px" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="col" />

        <router-link
          :to="{ name: 'settings' }"
          class="mt-nav-link row items-center q-mb-sm"
          :class="{ active: $route.name === 'settings' }"
        >
          <q-icon name="settings" size="22px" />
          <span>Settings</span>
        </router-link>

        <div class="mt-user row items-center q-px-sm q-pb-md">
          <div class="mt-avatar flex flex-center">{{ initials }}</div>
          <div class="col ellipsis q-ml-sm">
            <div class="text-weight-medium ellipsis">{{ auth.user?.name || 'Listener' }}</div>
            <div class="mt-muted text-caption ellipsis">{{ auth.user?.email }}</div>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container class="mt-main">
      <div class="mt-ambient" aria-hidden="true" />
      <router-view />
    </q-page-container>

    <q-footer class="mt-footer">
      <PlayerBar />
      <nav class="mt-mobile-nav lt-sm row">
        <router-link
          v-for="item in mobileNav"
          :key="item.name"
          :to="{ name: item.name }"
          class="mt-mobile-tab col column items-center justify-center"
          :class="{ active: $route.name === item.name }"
        >
          <q-icon :name="item.icon" size="22px" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </q-footer>

    <NowPlayingSheet />
  </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import PlayerBar from '@/components/player/PlayerBar.vue'
import NowPlayingSheet from '@/components/player/NowPlayingSheet.vue'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const drawerOpen = ref(true)

const navItems = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'search', label: 'Search', icon: 'search' },
  { name: 'library', label: 'Library', icon: 'library_music' },
  { name: 'liked', label: 'Liked', icon: 'favorite' },
  { name: 'playlists', label: 'Playlists', icon: 'queue_music' },
]

const mobileNav = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'library', label: 'Library', icon: 'library_music' },
  { name: 'liked', label: 'Liked', icon: 'favorite' },
  { name: 'playlists', label: 'Lists', icon: 'queue_music' },
]

const initials = computed(() => {
  const name = auth.user?.name || 'M'
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})
</script>

<style scoped>
.mt-shell {
  background: var(--mt-bg);
  color: var(--mt-text);
  min-height: 100vh;
}

.mt-sidebar {
  background: linear-gradient(180deg, #0c0e14 0%, #07080c 100%) !important;
  border-right: 1px solid var(--mt-border) !important;
}

.mt-sidebar-inner {
  padding: 28px 18px 12px;
}

.mt-brand {
  gap: 12px;
  color: var(--mt-text);
  text-decoration: none;
}

.mt-brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background:
    radial-gradient(circle at 30% 30%, #3dffb5, transparent 55%),
    linear-gradient(135deg, #ff7a45, #1a2332);
  box-shadow: 0 0 24px rgba(61, 255, 181, 0.25);
  animation: mt-pulse-soft 3.6s ease-in-out infinite;
}

.mt-brand-name {
  font-size: 1.45rem;
  line-height: 1;
}

.mt-nav-link {
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  color: var(--mt-text-muted);
  text-decoration: none;
  font-weight: 500;
  transition:
    background 180ms var(--ease-out),
    color 180ms var(--ease-out),
    transform 180ms var(--ease-out);
}

.mt-nav-link:hover {
  color: var(--mt-text);
  background: var(--mt-bg-panel);
}

.mt-nav-link.active {
  color: var(--mt-text);
  background: var(--mt-accent-soft);
}

.mt-nav-link.active .q-icon {
  color: var(--mt-accent);
}

.mt-user {
  border-top: 1px solid var(--mt-border);
  padding-top: 14px;
  margin-top: 8px;
}

.mt-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.mt-muted {
  color: var(--mt-text-muted);
}

.mt-main {
  position: relative;
  padding-bottom: calc(var(--mt-player) + 8px);
  background: var(--mt-bg);
}

@media (max-width: 599px) {
  .mt-main {
    padding-bottom: calc(var(--mt-player) + var(--mt-nav-mobile));
  }
}

.mt-ambient {
  pointer-events: none;
  position: absolute;
  inset: 0 0 auto 0;
  height: 420px;
  background:
    radial-gradient(ellipse 70% 80% at 10% -10%, rgba(61, 255, 181, 0.12), transparent 55%),
    radial-gradient(ellipse 50% 60% at 90% 0%, rgba(255, 122, 69, 0.1), transparent 50%);
  z-index: 0;
}

.mt-main :deep(.q-page) {
  position: relative;
  z-index: 1;
}

.mt-footer {
  background: transparent !important;
  border: none !important;
}

.mt-mobile-nav {
  height: var(--mt-nav-mobile);
  background: rgba(10, 11, 16, 0.92);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--mt-border);
}

.mt-mobile-tab {
  color: var(--mt-text-dim);
  text-decoration: none;
  font-size: 0.65rem;
  gap: 2px;
  transition: color 160ms var(--ease-out);
}

.mt-mobile-tab.active {
  color: var(--mt-accent);
}

[data-theme='light'] .mt-sidebar {
  background: linear-gradient(180deg, #ffffff 0%, #f6f4ef 100%) !important;
}

[data-theme='light'] .mt-mobile-nav {
  background: rgba(255, 255, 255, 0.94);
}

@media (prefers-reduced-motion: reduce) {
  .mt-brand-mark {
    animation: none;
  }
}
</style>
