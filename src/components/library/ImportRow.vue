<template>
  <div class="import-row" :class="{ failed: isFailed }">
    <div class="cover flex flex-center" :class="{ desat: isFailed }">
      <img
        v-if="thumbSrc && !isBrokenImage(thumbSrc)"
        :src="thumbSrc"
        alt=""
        @error="markBrokenImage(thumbSrc)"
      />
      <q-icon v-else :name="placeholderIcon" size="22px" />
    </div>

    <div class="meta col">
      <div class="title ellipsis" :class="{ pending: !row.title }">{{ displayTitle }}</div>
      <div class="sub" :class="{ error: isFailed && !isBlocked }">{{ subText }}</div>
      <router-link
        v-if="isBlocked && showAdminLink"
        :to="{ name: 'admin-youtube' }"
        class="admin-link"
      >
        {{ copy.blockedAdminLink }}
      </router-link>
      <ImportStatusChip
        class="chip-phone lt-sm"
        :status="row.status"
        :reason-code="row.reason_code"
      />
    </div>

    <div class="chip-col gt-xs">
      <ImportStatusChip :status="row.status" :reason-code="row.reason_code" />
    </div>

    <div class="actions row no-wrap items-center" :class="{ dim: offline }">
      <template v-if="canRetry">
        <q-btn
          unelevated
          no-caps
          class="retry gt-xs"
          icon="refresh"
          :label="copy.retry"
          @click="$emit('retry', row)"
        />
        <q-btn
          flat
          round
          dense
          class="icon-btn retry-icon lt-sm"
          icon="refresh"
          :aria-label="copy.retryLabel(displayTitle)"
          @click="$emit('retry', row)"
        />
      </template>
      <template v-if="isFailed">
        <q-btn
          flat
          no-caps
          class="dismiss gt-xs"
          :label="copy.dismiss"
          :aria-label="copy.dismissLabel(displayTitle)"
          @click="$emit('dismiss', row)"
        />
        <q-btn
          flat
          round
          dense
          class="icon-btn lt-sm"
          icon="close"
          :aria-label="copy.dismissLabel(displayTitle)"
          @click="$emit('dismiss', row)"
        />
      </template>
      <q-btn
        v-else-if="row.status === 'queued'"
        flat
        round
        dense
        class="icon-btn"
        icon="close"
        :aria-label="copy.dismissLabel(displayTitle)"
        @click="$emit('dismiss', row)"
      />
    </div>

    <q-linear-progress
      v-if="isActive"
      indeterminate
      size="3px"
      class="bar"
      :class="{ neutral: row.status === 'queued' }"
      role="progressbar"
      aria-busy="true"
      :aria-valuetext="statusLabel"
    />
    <q-tooltip v-if="isRunning">{{ copy.noCancel }}</q-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ImportStatusChip from '@/components/library/ImportStatusChip.vue'
import { YOUTUBE_COPY, importReasonText } from '@/constants/youtube-copy'
import { isBrokenImage, markBrokenImage } from '@/helpers/brokenImages'
import { toEngineProxyUrl } from '@/helpers/mediaUrl'

const props = defineProps({
  row: { type: Object, required: true },
  offline: { type: Boolean, default: false },
  showAdminLink: { type: Boolean, default: false },
})

defineEmits(['retry', 'dismiss'])

/** Retrying can't change these results (UI hides Retry; API still allows it) */
const FINAL_REASONS = ['too_long', 'too_large', 'unavailable']

const copy = YOUTUBE_COPY
const thumbSrc = computed(() => toEngineProxyUrl(props.row.thumbnail_url))
const isFailed = computed(() => props.row.status === 'failed')
const isBlocked = computed(() => isFailed.value && props.row.reason_code === 'blocked_by_youtube')
const isRunning = computed(() => ['downloading', 'processing'].includes(props.row.status))
const isActive = computed(() => isRunning.value || props.row.status === 'queued')
const canRetry = computed(() => isFailed.value && !FINAL_REASONS.includes(props.row.reason_code))
const displayTitle = computed(() => props.row.title || `youtu.be/${props.row.video_id}`)
const statusLabel = computed(() => copy.status[props.row.status] || copy.status.queued)
const placeholderIcon = computed(() => {
  if (isBlocked.value) return 'gpp_maybe'
  return props.row.title ? 'music_note' : 'link'
})
const subText = computed(() => {
  if (isFailed.value) return importReasonText(props.row.reason_code)
  return props.row.channel || (props.row.title ? '' : copy.waitingMeta)
})
</script>

<style scoped>
.import-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 10px 12px;
  border: 1px solid var(--mt-border);
  border-radius: 12px;
  background: var(--mt-bg-panel);
  overflow: hidden;
}

.import-row.failed {
  border-color: rgba(255, 143, 143, 0.18);
}

.cover {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(145deg, #1c2030, #0d1018);
  border: 1px solid var(--mt-border);
  color: var(--mt-text-dim);
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover.desat img {
  filter: grayscale(0.7);
  opacity: 0.7;
}

.meta {
  min-width: 0;
}

.title {
  font-weight: 600;
  font-size: 0.95rem;
}

.title.pending {
  color: var(--mt-text-muted);
}

.sub {
  margin-top: 2px;
  color: var(--mt-text-muted);
  font-size: 0.8rem;
  line-height: 1.35;
}

.sub.error {
  color: #ff8f8f;
}

.admin-link {
  display: inline-block;
  margin-top: 4px;
  color: var(--mt-accent);
  font-size: 0.8rem;
  font-weight: 600;
}

.chip-col {
  width: 190px;
  flex-shrink: 0;
}

.chip-phone {
  margin-top: 6px;
}

.actions {
  gap: 6px;
  flex-shrink: 0;
}

/*
 * Desktop: every row reserves the actions width of Retry + Dismiss (~178px), right
 * aligned, so the fixed 190px chip column lines up whether a row has two
 * buttons, one close icon or none (running).
 */
@media (min-width: 600px) {
  .actions {
    min-width: 184px;
    justify-content: flex-end;
  }
}

.actions.dim {
  opacity: 0.38;
}

.retry {
  border-radius: 999px;
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
  font-weight: 600;
}

.dismiss {
  color: var(--mt-text-muted);
  font-weight: 600;
}

.icon-btn {
  min-width: 40px;
  min-height: 40px;
  color: var(--mt-text-muted);
}

.retry-icon {
  color: var(--mt-accent);
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  color: var(--mt-accent);
}

.bar.neutral {
  color: var(--mt-text-dim);
}

@media (prefers-reduced-motion: reduce) {
  .bar :deep(.q-linear-progress__model) {
    animation: none;
    transform: none;
    width: 40%;
    opacity: 0.4;
  }
}
</style>
