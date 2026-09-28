import { engineAPI } from '@/helpers/api'

/**
 * @param {{ q?: string, per_page?: number, page?: number }} [params]
 */
export async function listTracks(params = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.per_page) query.set('per_page', String(params.per_page))
  if (params.page) query.set('page', String(params.page))
  const suffix = query.toString() ? `?${query}` : ''
  return engineAPI.get(`/tracks${suffix}`)
}

/**
 * @param {File} file
 * @param {{ onProgress?: (pct: number) => void }} [opts]
 */
export async function uploadTrack(file, opts = {}) {
  const form = new FormData()
  form.append('file', file)

  // XHR so we can report progress and catch silent size failures
  const res = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = `${engineAPI.baseURL}/tracks`
    const token = localStorage.getItem('max_tune_token')

    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof opts.onProgress !== 'function') return
      opts.onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      let body
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined
      } catch {
        body = xhr.responseText
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body)
        return
      }

      const message =
        (typeof body === 'object' && body?.message) ||
        (typeof body === 'object' && body?.errors?.file?.[0]) ||
        `Upload failed (${xhr.status})`
      // 4xx JSON copy from the engine (validation, quota) is user-facing; 5xx is not
      const userMessage =
        xhr.status >= 400 && xhr.status < 500 && typeof body === 'object'
          ? body?.errors?.file?.[0] || body?.message || null
          : null
      reject(Object.assign(new Error(message), { status: xhr.status, body, userMessage }))
    }

    xhr.onerror = () =>
      reject(Object.assign(new Error('Network error during upload'), { network: true }))
    xhr.ontimeout = () => reject(Object.assign(new Error('Upload timed out'), { network: true }))
    xhr.timeout = 5 * 60 * 1000
    xhr.send(form)
  })

  return res?.data ?? res
}

/**
 * @param {number|string} id
 */
export async function getTrack(id) {
  const res = await engineAPI.get(`/tracks/${id}`)
  return res?.data ?? res
}

/**
 * @param {number|string} id
 */
export async function deleteTrack(id) {
  return engineAPI.delete(`/tracks/${id}`)
}
