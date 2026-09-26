import { defineBoot } from '#q-app'
import { engineAPI, getApiMode, endpoints, setUnauthorizedHandler } from '@/helpers/api'
import { useImportsStore } from '@/stores/imports-store'

/**
 * Registers named API clients on the Vue app (greyon / IBPF boot pattern).
 * Import `engineAPI` from `@/helpers/api` or `@/boot/api` in stores/services.
 */
export default defineBoot(({ app, router }) => {
  setUnauthorizedHandler(() => {
    localStorage.removeItem('max_tune_token')
    // Session is gone: stop import polling (it would 401 every 3s) and drop the rows
    useImportsStore().stop()
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
