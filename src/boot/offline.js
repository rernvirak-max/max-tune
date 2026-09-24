import { defineBoot } from '#q-app'
import { useConnectivity } from '@/composables/useConnectivity'
import { useOfflineStore } from '@/stores/offline-store'

export default defineBoot(() => {
  // Start connectivity listeners + engine ping early
  useConnectivity()
  const offline = useOfflineStore()
  offline.hydrate().catch(() => {})
})
