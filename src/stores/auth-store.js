import { defineStore } from 'pinia'
import { engineAPI } from '@/helpers/api'
import { ApiError } from '@/helpers/api/createApiClient'
import { ERROR_COPY } from '@/constants/error-copy'
import { toUserMessage } from '@/helpers/userError'
import { useImportsStore } from '@/stores/imports-store'

const TOKEN_KEY = 'max_tune_token'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: null,
    app: null,
    bootstrapped: false,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    registrationEnabled: (state) => state.app?.registration_enabled === true,
    isAdmin: (state) => state.user?.is_admin === true || state.user?.role === 'admin',
    isInviteMode: (state) => state.app?.mode === 'invite',
  },

  actions: {
    setToken(token) {
      this.token = token
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    },

    async bootstrap() {
      if (this.token) {
        try {
          await this.fetchMe()
        } catch (err) {
          const status = err instanceof ApiError ? err.status : err?.status
          if (status === 401) {
            this.setToken(null)
            this.user = null
            this.app = null
          } else if (status === 403) {
            // disabled account mid-session
            this.setToken(null)
            this.user = null
            this.app = null
            this.error = 'This account is disabled'
          } else {
            this.user = null
            this.app = null
          }
        }
      }
      if (!this.app) {
        try {
          const data = await engineAPI.get('/app')
          this.app = data.app
        } catch {
          // engine unreachable — leave app null
        }
      }
      this.bootstrapped = true
    },

    async login(email, password) {
      this.loading = true
      this.error = null
      try {
        const data = await engineAPI.post('/auth/login', {
          email,
          password,
          device_name: 'max-tune-web',
        })
        this.setToken(data.token)
        this.user = data.user
        await this.fetchMe()
        return true
      } catch (err) {
        this.error = toUserMessage(err, ERROR_COPY.auth.login, {
          context: 'login',
          network: ERROR_COPY.unreachable,
        })
        const fieldErrors = err instanceof ApiError ? err.body?.errors : null
        if (fieldErrors?.email?.[0]) {
          this.error = fieldErrors.email[0]
        }
        throw err
      } finally {
        this.loading = false
      }
    },

    async register(payload) {
      this.loading = true
      this.error = null
      try {
        const data = await engineAPI.post('/auth/register', {
          ...payload,
          device_name: 'max-tune-web',
        })
        this.setToken(data.token)
        this.user = data.user
        await this.fetchMe()
        return true
      } catch (err) {
        this.error = toUserMessage(err, ERROR_COPY.auth.register, {
          context: 'register',
          network: ERROR_COPY.unreachable,
        })
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      const data = await engineAPI.get('/me')
      this.user = data.user
      this.app = data.app
      return data
    },

    async logout() {
      try {
        if (this.token) {
          await engineAPI.post('/auth/logout')
        }
      } catch {
        // ignore
      } finally {
        this.setToken(null)
        this.user = null
        useImportsStore().stop()
      }
    },
  },
})
