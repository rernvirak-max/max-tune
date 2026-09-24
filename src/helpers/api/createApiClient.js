/**
 * Lightweight API client factory (greyon / IBPF-style).
 * Bearer token from localStorage for Sanctum personal-access tokens.
 */

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {unknown} [body]
   */
  constructor(status, message, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * @typedef {Object} CreateApiClientOptions
 * @property {boolean} [withCredentials]
 * @property {string|null} [bearerStorageKey]
 * @property {(status: number, error: ApiError) => void} [onError]
 */

/**
 * @typedef {Object} ApiClient
 * @property {string} baseURL
 * @property {(path: string, init?: RequestInit) => Promise<any>} request
 * @property {(path: string, init?: RequestInit) => Promise<any>} get
 * @property {(path: string, body?: unknown, init?: RequestInit) => Promise<any>} post
 * @property {(path: string, body?: unknown, init?: RequestInit) => Promise<any>} put
 * @property {(path: string, body?: unknown, init?: RequestInit) => Promise<any>} patch
 * @property {(path: string, init?: RequestInit) => Promise<any>} delete
 */

/**
 * @param {string} baseURL
 * @param {CreateApiClientOptions} [options]
 * @returns {ApiClient}
 */
export function createApiClient(baseURL, options = {}) {
  const {
    // Bearer tokens don't need cookies — keeps CORS simple vs Herd
    withCredentials = false,
    bearerStorageKey = 'max_tune_token',
    onError = null,
  } = options
  const root = baseURL.replace(/\/$/, '')

  /**
   * @param {string} path
   * @param {RequestInit} [init]
   */
  async function request(path, init) {
    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData

    /** @type {Record<string, string>} */
    const headers = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(init?.headers || {}),
    }

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    if (bearerStorageKey && typeof localStorage !== 'undefined') {
      const token = localStorage.getItem(bearerStorageKey)
      if (token) headers.Authorization = `Bearer ${token}`
    }

    const url = path.startsWith('http') ? path : `${root}${path}`
    const response = await fetch(url, {
      ...init,
      headers,
      credentials: withCredentials ? 'include' : 'same-origin',
    })

    if (!response.ok) {
      let body
      const text = await response.text()
      try {
        body = text ? JSON.parse(text) : undefined
      } catch {
        body = text
      }
      const message =
        typeof body === 'object' && body?.message
          ? body.message
          : text || `API error ${response.status}`
      const error = new ApiError(response.status, message, body)
      if (typeof onError === 'function') {
        onError(response.status, error)
      }
      throw error
    }

    if (response.status === 204) return undefined
    const text = await response.text()
    if (!text) return undefined
    return JSON.parse(text)
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {unknown} [body]
   * @param {RequestInit} [init]
   */
  function withJsonBody(method, path, body, init) {
    const next = { ...init, method }
    if (body !== undefined) {
      next.body = JSON.stringify(body)
    }
    return request(path, next)
  }

  /**
   * Multipart upload (FormData). Do not JSON-encode.
   * @param {string} path
   * @param {FormData} formData
   * @param {RequestInit} [init]
   */
  function postForm(path, formData, init) {
    return request(path, { ...init, method: 'POST', body: formData })
  }

  return {
    baseURL: root,
    request,
    get: (path, init) => request(path, { ...init, method: 'GET' }),
    post: (path, body, init) => withJsonBody('POST', path, body, init),
    postForm,
    put: (path, body, init) => withJsonBody('PUT', path, body, init),
    patch: (path, body, init) => withJsonBody('PATCH', path, body, init),
    delete: (path, init) => request(path, { ...init, method: 'DELETE' }),
  }
}
