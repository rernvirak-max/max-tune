<template>
  <q-layout view="hHh lpR fFf" class="auth-layout">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup></script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--mt-bg);
  color: var(--mt-text);
}
</style>
