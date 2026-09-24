<template>
  <q-page class="login-page flex flex-center">
    <div class="login-stage">
      <div class="glow" aria-hidden="true" />
      <div class="login-card">
        <div class="brand row items-center">
          <span class="mark" aria-hidden="true" />
          <span class="mt-display name">MaxTune</span>
        </div>
        <p class="tagline">Your private listening room</p>

        <q-form class="form" @submit.prevent="onSubmit">
          <label class="field">
            <span>Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="username"
              :disabled="auth.loading"
            />
          </label>
          <label class="field">
            <span>Password</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              :disabled="auth.loading"
            />
          </label>

          <div v-if="auth.error" class="error">
            <div>{{ auth.error }}</div>
            <div v-if="isDisabledError" class="error-hint">
              Contact the person who invited you if that’s a surprise.
            </div>
          </div>

          <q-btn
            type="submit"
            class="submit"
            unelevated
            no-caps
            label="Sign in"
            :loading="auth.loading"
          />
        </q-form>

        <p v-if="auth.isInviteMode || auth.registrationEnabled" class="foot">
          Have an invite?
          <router-link :to="{ name: 'register' }" class="accent-link">Create account</router-link>
        </p>
        <p v-else class="foot">Personal mode — registration is closed</p>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('vireak@maxtune.local')
const password = ref('password')

const isDisabledError = computed(() =>
  String(auth.error || '').toLowerCase().includes('disabled'),
)

async function onSubmit() {
  try {
    await auth.login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch {
    // error shown via auth.error
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
[data-theme='light'] .login-page {
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0, 168, 120, 0.14), transparent 50%),
    radial-gradient(ellipse 70% 50% at 90% 80%, rgba(232, 90, 42, 0.1), transparent 45%),
    var(--mt-bg);
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
  box-shadow: 0 0 24px rgba(61, 255, 181, 0.25);
}
.name { font-size: 1.5rem; }
.tagline {
  margin: 12px 0 24px;
  color: var(--mt-text-muted);
  font-size: 0.95rem;
}
.form { display: flex; flex-direction: column; gap: 14px; }
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--mt-text-muted);
}
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
.error-hint { color: var(--mt-text-muted); font-size: 0.8rem; margin-top: 4px; }
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
</style>
