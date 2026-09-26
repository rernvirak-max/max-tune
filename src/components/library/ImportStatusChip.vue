<template>
  <span class="mt-status" :class="`is-${kind}`">
    <q-icon :name="icon" size="14px" aria-hidden="true" />
    <span>{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { YOUTUBE_COPY } from '@/constants/youtube-copy'

/**
 * Import status chip: always text + icon (never colour alone).
 * Failed + blocked_by_youtube gets its own dashed "Blocked" chip.
 */
const props = defineProps({
  status: { type: String, required: true },
  reasonCode: { type: String, default: null },
  /** Admin table uses the short "Blocked" label */
  short: { type: Boolean, default: false },
})

const ICONS = Object.freeze({
  queued: 'schedule',
  downloading: 'downloading',
  processing: 'autorenew',
  ready: 'check_circle',
  failed: 'error_outline',
  blocked: 'block',
})

const kind = computed(() =>
  props.status === 'failed' && props.reasonCode === 'blocked_by_youtube' ? 'blocked' : props.status,
)
const icon = computed(() => ICONS[kind.value] || ICONS.queued)
const label = computed(() => {
  if (kind.value === 'blocked' && props.short) return YOUTUBE_COPY.status.blockedShort
  return YOUTUBE_COPY.status[kind.value] || YOUTUBE_COPY.status.queued
})
</script>

<style scoped>
.mt-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  background: var(--mt-bg-panel-hover);
  color: var(--mt-text-muted);
}

.is-downloading,
.is-processing,
.is-ready {
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
}

.is-failed {
  background: color-mix(in srgb, #ff8f8f 12%, transparent);
  color: #ff8f8f;
}

.is-blocked {
  background: transparent;
  border: 1px dashed color-mix(in srgb, #ff8f8f 50%, transparent);
  color: var(--mt-text);
}
</style>
