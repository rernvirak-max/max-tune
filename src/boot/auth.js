import { defineBoot } from '#q-app'
import { useAuthStore } from '@/stores/auth-store'

export default defineBoot(async ({ router }) => {
  const auth = useAuthStore()
  await auth.bootstrap()

  router.beforeEach((to) => {
    if (!auth.bootstrapped) {
      return true
    }

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guest && auth.isAuthenticated) {
      return { name: 'home' }
    }

    return true
  })
})
