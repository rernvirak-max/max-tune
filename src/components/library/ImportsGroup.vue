<template>
  <section
    v-if="imports.visible.length"
    id="imports"
    class="imports"
    aria-labelledby="imports-title"
  >
    <header class="head row items-baseline justify-between no-wrap">
      <h2 id="imports-title" class="eyebrow">{{ copy.imports.title }}</h2>
      <span class="meta ellipsis">
        {{ $q.screen.xs ? copy.imports.metaShort : copy.imports.meta }}
      </span>
    </header>
    <div class="list" role="status" aria-live="polite">
      <ImportRow
        v-for="row in imports.visible"
        :key="row.id"
        :row="row"
        :offline="isOffline"
        :show-admin-link="auth.isAdmin"
        @retry="onRetry"
        @dismiss="onDismiss"
      />
    </div>
  </section>
</template>

<script setup>
import { useQuasar } from 'quasar'
import ImportRow from '@/components/library/ImportRow.vue'
import { YOUTUBE_COPY } from '@/constants/youtube-copy'
import { toUserMessage } from '@/helpers/userError'
import { useConnectivity } from '@/composables/useConnectivity'
import { useAuthStore } from '@/stores/auth-store'
import { useImportsStore } from '@/stores/imports-store'

const $q = useQuasar()
const imports = useImportsStore()
const auth = useAuthStore()
const connectivity = useConnectivity()
const { isOffline } = connectivity
const copy = YOUTUBE_COPY

async function onRetry(row) {
  if (!connectivity.requireOnline()) return
  try {
    await imports.retry(row.id)
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: toUserMessage(err, copy.errGeneric, { context: 'import retry' }),
      position: 'top',
    })
  }
}

async function onDismiss(row) {
  if (!connectivity.requireOnline()) return
  try {
    await imports.dismiss(row.id)
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: toUserMessage(err, copy.toastDismissFail, {
        context: 'import dismiss',
        allowServerMessage: false,
      }),
      position: 'top',
    })
  }
}
</script>

<style scoped>
.imports {
  margin-bottom: 20px;
}

.head {
  gap: 12px;
  margin-bottom: 10px;
}

.eyebrow {
  margin: 0;
  color: var(--mt-accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.meta {
  min-width: 0;
  color: var(--mt-text-dim);
  font-size: 0.78rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
