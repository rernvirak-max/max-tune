import { defineBoot } from '#q-app'
import { useConnectivity } from '@/composables/useConnectivity'
import { useOfflineStore } from '@/stores/offline-store'

export default defineBoot(({ router }) => {
  // Start connectivity listeners + engine ping early
  useConnectivity()
  const offline = useOfflineStore()
  offline.hydrate().catch(() => {})

  // Opening the app while offline: land on Library > Downloaded instead of Home,
  // which has nothing to show without a connection. Only the first navigation.
  let firstNavigation = true
  router.beforeEach((to) => {
    const isFirst = firstNavigation
    firstNavigation = false
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isFirst && browserOffline && to.name === 'home') {
      return { name: 'library', query: { offline: '1' } }
    }
    return true
  })
})
