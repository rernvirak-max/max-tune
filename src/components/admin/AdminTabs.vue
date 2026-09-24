<template>
  <nav class="tabs" aria-label="Admin sections">
    <button
      v-for="t in tabs"
      :key="t.name"
      type="button"
      class="tab"
      :class="{ on: $route.name === t.name }"
      @click="$router.push({ name: t.name })"
    >
      {{ t.label }}
    </button>
  </nav>
</template>
<script setup>
const tabs = [
  { name: 'admin-invites', label: 'Invites' },
  { name: 'admin-users', label: 'Users' },
  { name: 'admin-tracks', label: 'Tracks' },
]
</script>
<style scoped>
.tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.tab {
  border: 1px solid var(--mt-border);
  background: transparent;
  color: var(--mt-text-muted);
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  font: inherit;
}
.tab.on { color: var(--mt-bg); background: var(--mt-accent); border-color: var(--mt-accent); }
</style>
