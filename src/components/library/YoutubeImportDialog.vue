<template>
  <q-dialog
    :model-value="modelValue"
    :position="isPhone ? 'bottom' : 'standard'"
    :transition-show="slides ? 'slide-up' : 'fade'"
    :transition-hide="slides ? 'slide-down' : 'fade'"
    aria-labelledby="yt-dialog-title"
    @update:model-value="$emit('update:modelValue', $event)"
    @show="onShow"
    @hide="onHide"
  >
    <q-card class="yt-card" :class="{ phone: isPhone }">
      <div v-if="isPhone" v-touch-swipe.mouse.down="close" class="grabber-zone">
        <div class="grabber" />
      </div>

      <header class="row items-start justify-between no-wrap">
        <h2 id="yt-dialog-title" class="mt-display title">{{ copy.title }}</h2>
        <q-btn
          flat
          round
          dense
          icon="close"
          class="close"
          :aria-label="copy.cancel"
          @click="close"
        />
      </header>
      <p class="helper">{{ copy.helper }}</p>

      <q-btn
        v-if="isPhone && canPaste"
        ref="pasteBtn"
        unelevated
        no-caps
        class="paste-full full-width"
        icon="content_paste"
        :label="copy.pasteFull"
        :disable="locked"
        @click="pasteFromClipboard"
      />

      <label for="yt-url" class="field-label">{{ copy.fieldLabel }}</label>
      <q-input
        ref="urlInput"
        v-model="url"
        for="yt-url"
        outlined
        dark
        type="url"
        inputmode="url"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        class="url-field"
        :class="`is-${lineKind}`"
        :placeholder="copy.placeholder"
        :readonly="submitting"
        :disable="isOffline"
        :aria-invalid="lineKind === 'error'"
        aria-describedby="yt-url-line"
        @blur="touched = true"
        @paste="touched = true"
        @keyup.enter="submit"
      >
        <template #prepend>
          <q-icon name="link" />
        </template>
        <template #append>
          <q-btn
            v-if="!isPhone && canPaste"
            flat
            no-caps
            dense
            class="paste-inline"
            icon="content_paste"
            :label="copy.paste"
            :disable="locked"
            @click="pasteFromClipboard"
          />
          <q-btn
            v-else-if="isPhone && url"
            flat
            round
            dense
            icon="cancel"
            class="clear"
            :aria-label="copy.clearLink"
            @click="url = ''"
          />
        </template>
      </q-input>

      <div id="yt-url-line" class="lines">
        <div v-if="line" class="line row no-wrap items-start" :class="`is-${lineKind}`">
          <q-icon :name="LINE_ICONS[lineKind]" size="16px" class="line-icon" />
          <span>
            {{ line }}
            <button v-if="duplicate" type="button" class="line-link" @click="openDuplicate">
              {{ duplicate.type === 'track' ? copy.openTrack : copy.seeImports }}
            </button>
          </span>
        </div>
        <div v-if="showFormats" class="line row no-wrap items-start is-hint">
          <q-icon name="info_outline" size="16px" class="line-icon" />
          <span>{{ copy.formats }}</span>
        </div>
      </div>

      <div v-if="!isPhone && parsed.status === 'valid'" class="detected row no-wrap items-center">
        <div class="detected-icon flex flex-center">
          <q-icon name="smart_display" size="20px" />
        </div>
        <div class="col">
          <div class="detected-title">
            {{ parsed.isShort ? copy.detectedShort : copy.detectedVideo }}
            <code>{{ parsed.videoId }}</code>
          </div>
          <div class="detected-sub">{{ copy.detected }}</div>
        </div>
      </div>

      <div class="actions row items-center justify-end no-wrap">
        <q-btn
          v-if="!isPhone"
          flat
          no-caps
          class="cancel"
          :label="copy.cancel"
          :disable="submitting"
          @click="close"
        />
        <q-btn
          ref="submitBtn"
          unelevated
          no-caps
          class="submit"
          :class="{ 'full-width': isPhone }"
          icon="add"
          :label="copy.submit"
          :loading="submitting"
          :disable="!canSubmit"
          @click="submit"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { YOUTUBE_COPY } from '@/constants/youtube-copy'
import { toUserMessage } from '@/helpers/userError'
import { parseYoutubeUrl } from '@/helpers/youtubeUrl'
import { useConnectivity } from '@/composables/useConnectivity'
import { useImportsStore } from '@/stores/imports-store'

defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'open-track', 'see-imports', 'hide'])

/** Live validation waits for typing to settle */
const VALIDATE_DEBOUNCE_MS = 250
/** Below this length an invalid link is probably still being typed */
const MIN_CHARS_FOR_LIVE_ERROR = 8
const SECONDS_PER_MINUTE = 60
const LINE_ICONS = Object.freeze({
  error: 'error',
  valid: 'check_circle',
  info: 'info_outline',
})
/** Engine 4xx `code` → dialog copy (409 duplicate and 429 rate limit handled separately) */
const SUBMIT_ERRORS = Object.freeze({
  invalid_url: YOUTUBE_COPY.errInvalid,
  playlist_not_supported: YOUTUBE_COPY.errPlaylist,
  quota_exceeded: YOUTUBE_COPY.errQuota,
  too_many_imports: YOUTUBE_COPY.errTooMany,
})

const $q = useQuasar()
const imports = useImportsStore()
const { isOffline } = useConnectivity()
const copy = YOUTUBE_COPY

const url = ref('')
const settledUrl = ref('')
const touched = ref(false)
const submitting = ref(false)
const serverError = ref('')
const duplicate = ref(null)
const clipboardInfo = ref('')
const urlInput = ref(null)
const pasteBtn = ref(null)
const submitBtn = ref(null)
let debounceTimer = null

const isPhone = computed(() => $q.screen.xs)
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** Phone sheet slides up unless the user asked for reduced motion (then fade only) */
const slides = computed(() => isPhone.value && !prefersReducedMotion)
const canPaste = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText)
const locked = computed(() => submitting.value || isOffline.value)
const parsed = computed(() => parseYoutubeUrl(settledUrl.value))
const showInvalid = computed(
  () =>
    parsed.value.status === 'invalid' &&
    (touched.value || settledUrl.value.trim().length >= MIN_CHARS_FOR_LIVE_ERROR),
)
const canSubmit = computed(() => parseYoutubeUrl(url.value).status === 'valid' && !isOffline.value)

const line = computed(() => {
  if (isOffline.value) return copy.offline
  if (serverError.value) return serverError.value
  if (clipboardInfo.value) return clipboardInfo.value
  if (parsed.value.status === 'playlist') return copy.errPlaylist
  if (showInvalid.value) return copy.errInvalid
  if (parsed.value.status === 'valid')
    return parsed.value.listIgnored ? copy.listIgnored : copy.valid
  return ''
})
const lineKind = computed(() => {
  if (isOffline.value || (clipboardInfo.value && !serverError.value)) return 'info'
  if (serverError.value || parsed.value.status === 'playlist' || showInvalid.value) return 'error'
  if (parsed.value.status === 'valid') return 'valid'
  return 'idle'
})
const showFormats = computed(() => parsed.value.status !== 'valid' && !isOffline.value)

watch(url, (value) => {
  serverError.value = ''
  duplicate.value = null
  clipboardInfo.value = ''
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    settledUrl.value = value
  }, VALIDATE_DEBOUNCE_MS)
})

// Paste and blur validate at once instead of waiting for the debounce
watch(touched, (value) => {
  if (value) settledUrl.value = url.value
})

function close() {
  emit('update:modelValue', false)
}

/** Reset for next time, then let the page restore focus to its entry button. */
function onHide() {
  reset()
  emit('hide')
}

function reset() {
  clearTimeout(debounceTimer)
  url.value = ''
  settledUrl.value = ''
  touched.value = false
  submitting.value = false
  serverError.value = ''
  duplicate.value = null
  clipboardInfo.value = ''
}

/** Phone: thumb-reach Paste button first (keyboard not open yet); desktop: the field. */
function onShow() {
  if (isPhone.value && canPaste) pasteBtn.value?.$el?.focus()
  else urlInput.value?.focus()
}

async function pasteFromClipboard() {
  try {
    url.value = (await navigator.clipboard.readText()).trim()
    touched.value = true
    settledUrl.value = url.value
    await nextTick()
    submitBtn.value?.$el?.focus()
  } catch {
    // Permission denied / insecure context: fall back to a manual paste
    urlInput.value?.focus()
    await nextTick()
    clipboardInfo.value = copy.clipDenied
  }
}

function openDuplicate() {
  const target = duplicate.value
  close()
  if (target.type === 'track') emit('open-track', target.id)
  else emit('see-imports')
}

/** Map the engine's `code` to frozen copy; network / 5xx / unknown fall back to errGeneric. */
function submitErrorCopy(err) {
  const fallback = toUserMessage(err, copy.errGeneric, {
    context: 'youtube import',
    allowServerMessage: false,
  })
  const body = err?.body || {}
  if (body.existing) {
    return body.existing.type === 'track' ? copy.errDuplicateTrack : copy.errDuplicateImport
  }
  if (body.code === 'rate_limited') {
    return copy.errRate(Math.max(1, Math.ceil(Number(body.retry_after) / SECONDS_PER_MINUTE)))
  }
  return SUBMIT_ERRORS[body.code] || fallback
}

async function submit() {
  touched.value = true
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    await imports.submit(url.value.trim())
    close()
  } catch (err) {
    serverError.value = submitErrorCopy(err)
    duplicate.value = err?.status === 409 ? (err.body?.existing ?? null) : null
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.yt-card {
  width: 560px;
  max-width: 92vw;
  padding: 24px 24px 20px;
  border-radius: 24px;
  border: 1px solid var(--mt-border);
  background:
    radial-gradient(circle at 12% 0%, rgba(61, 255, 181, 0.08), transparent 45%),
    radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.04), transparent 50%),
    var(--mt-bg-elevated);
}

.yt-card.phone {
  width: 100vw;
  max-width: 100vw;
  padding: 8px 20px calc(20px + env(safe-area-inset-bottom));
  border-radius: 24px 24px 0 0;
}

.grabber-zone {
  display: flex;
  justify-content: center;
  padding: 6px 0 12px;
  cursor: grab;
}

.grabber {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: var(--mt-text-dim);
}

.title {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
}

.phone .title {
  font-size: 24px;
}

.close {
  color: var(--mt-text-muted);
}

.helper {
  margin: 6px 0 18px;
  color: var(--mt-text-muted);
  font-size: 0.9rem;
}

.paste-full {
  min-height: 48px;
  margin-bottom: 18px;
  border-radius: 999px;
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
  font-weight: 600;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--mt-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.url-field :deep(.q-field__control) {
  min-height: 52px;
  border-radius: 12px;
}

.url-field.is-valid :deep(.q-field__control)::before {
  border-color: var(--mt-accent);
}

.url-field.is-error :deep(.q-field__control)::before {
  border-color: #ff8f8f;
}

.url-field.is-error :deep(.q-field__prepend) {
  color: #ff8f8f;
}

.url-field :deep(.q-field__native) {
  text-overflow: ellipsis;
}

.paste-inline {
  border-radius: 8px;
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
  font-weight: 600;
  padding: 4px 10px;
}

.clear {
  color: var(--mt-text-muted);
}

.lines {
  margin-top: 8px;
}

.line {
  gap: 8px;
  padding: 3px 0;
  font-size: 0.85rem;
  line-height: 1.4;
}

.line-icon {
  margin-top: 1px;
  flex-shrink: 0;
}

.line.is-error {
  color: #ff8f8f;
}

.line.is-valid {
  color: var(--mt-accent);
}

.line.is-info,
.line.is-hint {
  color: var(--mt-text-muted);
}

.line-link {
  margin-left: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--mt-text);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.detected {
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid var(--mt-border);
  border-radius: 12px;
  background: var(--mt-bg-panel);
}

.detected-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--mt-accent-soft);
  color: var(--mt-accent);
}

.detected-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.detected-title code {
  margin-left: 4px;
  color: var(--mt-text-dim);
  font-weight: 400;
}

.detected-sub {
  color: var(--mt-text-muted);
  font-size: 0.8rem;
}

.actions {
  gap: 12px;
  margin-top: 22px;
}

.cancel {
  color: var(--mt-text-muted);
  font-weight: 600;
}

.submit {
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  background: var(--mt-text);
  color: var(--mt-bg);
  font-weight: 700;
}
</style>
