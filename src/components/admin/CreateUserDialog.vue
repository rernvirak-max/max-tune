<template>
  <q-dialog
    :model-value="modelValue"
    :persistent="Boolean(credentials) || submitting"
    @update:model-value="onToggle"
    @hide="reset"
  >
    <q-card
      class="dialog-card"
      role="dialog"
      :aria-label="credentials ? 'User created' : 'Create user'"
    >
      <!-- Step 2: credentials, shown once -->
      <template v-if="credentials">
        <q-card-section>
          <div class="text-h6">User created</div>
          <p class="muted lead">Share these sign-in details with {{ credentials.name }}.</p>
        </q-card-section>
        <q-card-section class="cred-section">
          <div class="cred-card" data-test="credentials-card">
            <div class="cred-row">
              <span class="cred-label">Email</span>
              <span class="cred-value">{{ credentials.email }}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">{{
                credentials.temporary ? 'Temporary password' : 'Password'
              }}</span>
              <span class="cred-value mono" data-test="credentials-password">{{
                credentials.password
              }}</span>
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="content_copy"
                aria-label="Copy password"
                @click="copyText(credentials.password, 'Password copied')"
              />
            </div>
            <div class="cred-row">
              <span class="cred-label">Sign in</span>
              <span class="cred-value link">{{ credentials.loginUrl }}</span>
            </div>
          </div>
          <div class="once-note" role="note">
            <q-icon name="visibility_off" size="18px" />
            <span>
              <strong>Shown once.</strong> This password isn’t stored and can’t be shown again. Copy
              it now and share it privately.
            </span>
          </div>
        </q-card-section>
        <q-card-actions class="cred-actions">
          <q-btn
            class="pill"
            unelevated
            no-caps
            icon="content_copy"
            label="Copy credentials"
            @click="copyCredentials"
          />
          <q-btn flat no-caps label="Done" @click="close" />
        </q-card-actions>
      </template>

      <!-- Step 1: form -->
      <template v-else>
        <q-card-section>
          <div class="text-h6">Create user</div>
          <p class="muted lead">Add an account directly. It works in any app mode.</p>
        </q-card-section>
        <q-form class="form-body" greedy @submit.prevent="submit">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="form.name"
              outlined
              dark
              dense
              label="Name"
              autocomplete="off"
              maxlength="120"
              :error="Boolean(errors.name)"
              :error-message="errors.name"
              @update:model-value="errors.name = ''"
            />
            <q-input
              v-model="form.email"
              type="email"
              outlined
              dark
              dense
              label="Email"
              autocomplete="off"
              inputmode="email"
              :error="Boolean(errors.email)"
              :error-message="errors.email"
              @update:model-value="errors.email = ''"
            />
            <q-toggle v-model="form.generate" color="primary" label="Generate a password for me" />
            <q-input
              v-if="!form.generate"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              outlined
              dark
              dense
              label="Password"
              hint="At least 8 characters"
              autocomplete="new-password"
              :error="Boolean(errors.password)"
              :error-message="errors.password"
              @update:model-value="errors.password = ''"
            >
              <template #append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>
            <p v-else class="muted gen-note">
              A strong one-time password will be created and shown to you after saving.
            </p>
            <q-input
              v-model="form.quotaGb"
              type="number"
              outlined
              dark
              dense
              label="Storage quota (GB, optional)"
              :hint="quotaHint"
              min="0"
              step="0.5"
              inputmode="decimal"
              :error="Boolean(errors.quota)"
              :error-message="errors.quota"
              @update:model-value="errors.quota = ''"
            />
            <p v-if="formError" class="err-line" role="alert" data-test="create-user-error">
              {{ formError }}
            </p>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps label="Cancel" :disable="submitting" v-close-popup />
            <q-btn
              class="pill"
              unelevated
              no-caps
              type="submit"
              label="Create user"
              :loading="submitting"
            />
          </q-card-actions>
        </q-form>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { engineAPI } from '@/helpers/api'
import { ERROR_COPY } from '@/constants/error-copy'
import { toUserMessage } from '@/helpers/userError'
import { useAuthStore } from '@/stores/auth-store'
import { useCopyShare } from '@/composables/useCopyShare'
import { buildLoginLink, getRouterLinkConfig } from '@/helpers/appLinks'
import {
  buildCreateUserPayload,
  fieldErrorsFromApiError,
  formatCredentials,
  validateCreateUser,
} from '@/helpers/adminUsers'

defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'created'])

const auth = useAuthStore()
const { copyText } = useCopyShare()

const emptyForm = () => ({ name: '', email: '', generate: true, password: '', quotaGb: '' })
const form = reactive(emptyForm())
const errors = reactive({ name: '', email: '', password: '', quota: '' })
const formError = ref('')
const submitting = ref(false)
const showPassword = ref(false)
/** One-time credentials; lives only in this component's memory and is wiped on close. */
const credentials = ref(null)

const quotaHint = computed(() => {
  const bytes = Number(auth.app?.default_storage_quota_bytes)
  const gb = bytes > 0 ? Math.round((bytes / 1024 ** 3) * 10) / 10 : 5
  return `Leave empty for the default (${gb} GB)`
})

function clearErrors() {
  Object.assign(errors, { name: '', email: '', password: '', quota: '' })
  formError.value = ''
}

function reset() {
  Object.assign(form, emptyForm())
  clearErrors()
  showPassword.value = false
  credentials.value = null
}

function close() {
  emit('update:modelValue', false)
}

function onToggle(value) {
  if (!value && (credentials.value || submitting.value)) return
  emit('update:modelValue', value)
}

function errorMessageFor(err) {
  if (err?.status === 403) return 'Only admins can create users.'
  return toUserMessage(err, ERROR_COPY.action.createUser, {
    context: 'create user',
    allowServerMessage: false,
    network: ERROR_COPY.unreachable,
  })
}

async function submit() {
  if (submitting.value) return
  clearErrors()
  const problems = validateCreateUser(form)
  if (Object.keys(problems).length) {
    Object.assign(errors, problems)
    return
  }

  submitting.value = true
  try {
    const res = await engineAPI.post('/admin/users', buildCreateUserPayload(form))
    const temporary = typeof res?.temporary_password === 'string' && res.temporary_password !== ''
    credentials.value = {
      name: res?.data?.name || form.name.trim(),
      email: res?.data?.email || form.email.trim(),
      password: temporary ? res.temporary_password : form.password,
      temporary,
      loginUrl: buildLoginLink({ origin: window.location.origin, ...getRouterLinkConfig() }),
    }
    // Drop the typed password from the form state; the card holds the only copy.
    form.password = ''
    emit('created', res?.data)
  } catch (err) {
    const fields = fieldErrorsFromApiError(err)
    if (Object.keys(fields).length) {
      Object.assign(errors, fields)
    } else {
      formError.value = errorMessageFor(err)
    }
  } finally {
    submitting.value = false
  }
}

function copyCredentials() {
  const c = credentials.value
  if (!c) return
  copyText(
    formatCredentials({
      email: c.email,
      password: c.password,
      loginUrl: c.loginUrl,
      temporary: c.temporary,
    }),
    'Credentials copied',
  )
}
</script>

<style scoped>
.dialog-card {
  width: min(460px, 92vw);
  max-height: 92vh;
  overflow-y: auto;
  background: var(--mt-bg-elevated);
  border: 1px solid var(--mt-border);
  border-radius: 16px;
}
.muted {
  color: var(--mt-text-muted);
}
.lead {
  margin: 6px 0 0;
  font-size: 0.875rem;
}
.gen-note {
  margin: 0;
  font-size: 0.8125rem;
}
.pill {
  border-radius: 999px !important;
  background: var(--mt-text) !important;
  color: var(--mt-bg) !important;
}
.err-line {
  margin: 0;
  color: #ff8f8f;
  font-size: 0.875rem;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.04em;
}

.cred-section {
  padding-top: 0;
}
.cred-card {
  border: 1px solid var(--mt-border);
  background: var(--mt-bg-panel);
  border-radius: 12px;
  overflow: hidden;
}
.cred-row {
  display: grid;
  grid-template-columns: 7.5rem 1fr auto;
  align-items: center;
  gap: 4px 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--mt-border);
}
.cred-row:last-child {
  border-bottom: 0;
}
.cred-label {
  color: var(--mt-text-muted);
  font-size: 0.75rem;
}
.cred-value {
  min-width: 0;
  overflow-wrap: anywhere;
  grid-column: 2;
}
.cred-value.mono {
  color: var(--mt-accent);
  font-size: 1rem;
  user-select: all;
}
.cred-value.link {
  font-size: 0.8125rem;
  color: var(--mt-text-muted);
}
.once-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--mt-warm);
  background: color-mix(in srgb, var(--mt-warm) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--mt-warm) 35%, transparent);
}
.once-note strong {
  color: var(--mt-warm);
}
.cred-actions {
  padding: 8px 16px 16px;
  gap: 8px;
  justify-content: space-between;
}

@media (max-width: 480px) {
  .cred-row {
    grid-template-columns: 1fr auto;
  }
  .cred-label {
    grid-column: 1 / -1;
  }
  .cred-value {
    grid-column: 1;
  }
}
</style>
