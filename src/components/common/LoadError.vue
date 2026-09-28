<template>
  <div v-if="!isBrowserOffline" class="load-error row items-center no-wrap" role="alert">
    <q-icon name="error_outline" size="20px" class="icon" />
    <div class="col msg">{{ message || copy.generic }}</div>
    <q-btn
      flat
      no-caps
      dense
      class="retry"
      icon="refresh"
      :label="copy.retry"
      :loading="loading"
      @click="onRetry"
    />
  </div>
</template>

<script setup>
import { ERROR_COPY } from '@/constants/error-copy'
import { useConnectivity } from '@/composables/useConnectivity'

/**
 * Friendly load-failure card with Retry. Hidden while the browser is offline:
 * the layout's offline banner already explains why nothing loads.
 */
defineProps({
  message: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['retry'])

const copy = ERROR_COPY
const { isBrowserOffline, pingEngine } = useConnectivity()

function onRetry() {
  pingEngine()
  emit('retry')
}
</script>

<style scoped>
.load-error {
  gap: 12px;
  margin: 12px 0;
  padding: 12px 12px 12px 16px;
  border: 1px solid var(--mt-border);
  border-radius: 12px;
  background: var(--mt-bg-panel);
  color: var(--mt-text);
  font-size: 0.9rem;
  line-height: 1.4;
}

.icon {
  color: var(--mt-warm, #ff7a45);
  flex-shrink: 0;
}

.msg {
  min-width: 0;
}

.retry {
  flex-shrink: 0;
  color: var(--mt-accent);
  font-weight: 600;
}
</style>
