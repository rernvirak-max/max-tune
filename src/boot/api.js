import { defineBoot } from '#q-app'
import { engineAPI, getApiMode, endpoints, setUnauthorizedHandler } from '@/helpers/api'

/**
 * Registers named API clients on the Vue app (greyon / IBPF boot pattern).
 * Import `engineAPI` from `@/helpers/api` or `@/boot/api` in stores/services.
 */
export default defineBoot(({ app, router }) => {
  setUnauthorizedHandler(() => {
    localStorage.removeItem('max_tune_token')
    const route = router.currentRoute.value
    if (route.name !== 'login') {
      router.push({ name: 'login', query: { redirect: route.fullPath } })
    }
  })

  app.config.globalProperties.$engineAPI = engineAPI
  app.config.globalProperties.$apiMode = getApiMode()
  app.config.globalProperties.$apiEndpoints = endpoints
})

export { engineAPI, getApiMode, endpoints }
