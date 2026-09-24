<template>
  <q-page class="admin-page flex flex-center">
    <div class="denied column items-center">
      <q-icon name="lock" size="48px" class="muted" />
      <h1 class="mt-display">Admins only</h1>
      <p class="muted">You don’t have access to this backstage.</p>
      <q-btn class="pill" unelevated no-caps label="Back home" :to="{ name: 'home' }" />
    </div>
  </q-page>
</template>
<style scoped>
.admin-page { min-height: 60vh; padding: 40px 20px; }
.denied { gap: 12px; text-align: center; }
.muted { color: var(--mt-text-muted); }
.pill {
  margin-top: 8px;
  border-radius: 999px !important;
  background: var(--mt-text) !important;
  color: var(--mt-bg) !important;
}
</style>
