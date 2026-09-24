<template>
  <q-page class="login-page flex flex-center">
    <div class="login-stage">
      <div class="glow" aria-hidden="true" />
      <div class="login-card">
        <div class="brand row items-center">
          <span class="mark" aria-hidden="true" />
          <span class="mt-display name">MaxTune</span>
        </div>
        <p class="tagline">Join with an invite</p>

        <div v-if="!inviteMode" class="closed">
          <p class="error">Registration is closed</p>
          <router-link :to="{ name: 'login' }" class="accent-link">Sign in</router-link>
        </div>

        <q-form v-else class="form" @submit.prevent="onSubmit">
          <label class="field">
            <span>Invite code</span>
            <input
              v-model="inviteCode"
              type="text"
              autocomplete="one-time-code"
              :disabled="auth.loading"
              aria-describedby="invite-err"
            />
          </label>
          <label class="field">
            <span>Name</span>
            <input v-model="name" type="text" autocomplete="name" :disabled="auth.loading" />
          </label>
          <label class="field">
            <span>Email</span>
            <input v-model="email" type="email" autocomplete="username" :disabled="auth.loading" />
          </label>
          <label class="field">
            <span>Password</span>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              :disabled="auth.loading"
            />
          </label>
          <label class="field">
            <span>Confirm password</span>
            <input
              v-model="passwordConfirmation"
              type="password"
              autocomplete="new-password"
              :disabled="auth.loading"
            />
          </label>

          <div v-if="formError" id="invite-err" class="error" role="alert">{{ formError }}</div>

          <q-btn
            type="submit"
            class="submit"
            unelevated
            no-caps
            label="Create account"
            :loading="auth.loading"
          />
        </q-form>

        <p class="foot">
          Already listening?
          <router-link :to="{ name: 'login' }" class="accent-link">Sign in</router-link>
        </p>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Notify } from 'quasar'
import { useAuthStore } from '@/stores/auth-store'
import { ApiError } from '@/helpers/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const inviteCode = ref('')
const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const formError = ref(null)

const inviteMode = computed(() => auth.app?.mode === 'invite' || auth.registrationEnabled)

onMounted(() => {
  const code = typeof route.query.code === 'string' ? route.query.code.trim() : ''
  if (code) inviteCode.value = code
  if (!auth.app && auth.bootstrapped) {
    // guest bootstrap may not have /me — treat missing mode as personal until login/me
  }
})

async function onSubmit() {
  formError.value = null
  if (!inviteCode.value.trim()) {
    formError.value = 'Invite code required'
    return
  }
  try {
    await auth.register({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
      invite_code: inviteCode.value.trim(),
    })
    Notify.create({ message: 'Welcome to MaxTune', color: 'dark', timeout: 2500 })
    await router.replace({ name: 'home' })
  } catch (err) {
    const errors = err instanceof ApiError ? err.body?.errors : null
    formError.value =
      errors?.invite_code?.[0] ||
      errors?.email?.[0] ||
      errors?.password?.[0] ||
      err?.message ||
      "Couldn't create account"
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, rgba(61, 255, 181, 0.16), transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 80%, rgba(255, 122, 69, 0.14), transparent 45%),
    var(--mt-bg);
  color: var(--mt-text);
}
.login-stage {
  position: relative;
  width: min(420px, 92vw);
  animation: mt-fade-up 500ms var(--ease-out) both;
}
.glow {
  position: absolute;
  inset: -40px;
  background: radial-gradient(circle, rgba(61, 255, 181, 0.12), transparent 60%);
  filter: blur(20px);
  z-index: 0;
}
.login-card {
  position: relative;
  z-index: 1;
  padding: 36px 32px 28px;
  border-radius: 24px;
  border: 1px solid var(--mt-border);
  background: color-mix(in srgb, var(--mt-bg-elevated) 85%, transparent);
  backdrop-filter: blur(18px);
}
.brand { gap: 12px; }
.mark {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background:
    radial-gradient(circle at 30% 30%, #3dffb5, transparent 55%),
    linear-gradient(135deg, #ff7a45, #1a2332);
}
.name { font-size: 1.5rem; }
.tagline {
  margin: 12px 0 24px;
  color: var(--mt-text-muted);
  font-size: 0.95rem;
}
.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: var(--mt-text-muted); }
.field input {
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--mt-border);
  background: var(--mt-bg);
  color: var(--mt-text);
  padding: 0 14px;
  font: inherit;
}
.field input:focus {
  outline: none;
  border-color: var(--mt-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--mt-accent) 25%, transparent);
}
.error { color: #ff8f8f; font-size: 0.9rem; }
.submit {
  margin-top: 8px;
  height: 48px;
  border-radius: 999px;
  background: var(--mt-text) !important;
  color: var(--mt-bg) !important;
  font-weight: 600;
}
.foot { margin-top: 20px; color: var(--mt-text-muted); font-size: 0.9rem; }
.accent-link { color: var(--mt-accent); text-decoration: none; margin-left: 4px; }
.closed { text-align: center; padding: 12px 0; }
</style>
