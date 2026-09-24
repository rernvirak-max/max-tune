import { getApiEndpoints } from '@/helpers/api/apiConfig'
import { createApiClient } from '@/helpers/api/createApiClient'

const endpoints = getApiEndpoints()

/** Set from boot/api so 401 can redirect without circular imports */
let unauthorizedHandler = null

/**
 * @param {((status: number, error: import('./createApiClient').ApiError) => void) | null} handler
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

/** max-tune-engine JSON API (Sanctum bearer) */
export const engineAPI = createApiClient(endpoints.ENGINE_URL, {
  onError: (status, error) => {
    if (status === 401 && typeof unauthorizedHandler === 'function') {
      unauthorizedHandler(status, error)
    }
  },
})

export { endpoints }
