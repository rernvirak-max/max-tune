<template>
  <span class="brand-lockup" :style="{ '--lockup-h': `${height}px` }">
    <img
      class="lockup lockup-dark"
      :src="lockupDark"
      alt="MaxTune"
      :height="height"
      decoding="async"
    />
    <img
      class="lockup lockup-light"
      :src="lockupLight"
      alt=""
      aria-hidden="true"
      :height="height"
      decoding="async"
    />
  </span>
</template>

<script setup>
import lockupDark from '@/assets/brand/lockup-dark.svg'
import lockupLight from '@/assets/brand/lockup-light.svg'

defineProps({
  // Rendered height in px. The lockup art carries ~12% padding on every side, which is
  // pulled back with negative margins so the mark lines up with surrounding content.
  height: { type: Number, default: 44 },
})
</script>

<style>
.brand-lockup {
  display: inline-block;
  line-height: 0;
  margin: calc(var(--lockup-h) * -0.121);
}
.brand-lockup .lockup {
  display: block;
  height: var(--lockup-h);
  width: auto;
}
.brand-lockup .lockup-light {
  display: none;
}
[data-theme='light'] .brand-lockup .lockup-dark {
  display: none;
}
[data-theme='light'] .brand-lockup .lockup-light {
  display: block;
}
</style>
