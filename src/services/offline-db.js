/**
 * IndexedDB for offline track audio + metadata.
 * Audio blobs live here (not exclusively in the service worker cache).
 */

const DB_NAME = 'maxtune-offline'
const DB_VERSION = 1
const STORE = 'tracks'

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'))
      req.onsuccess = () => resolve(req.result)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      }
    })
  }
  return dbPromise
}

/**
 * @template T
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest|void} fn
 * @returns {Promise<T>}
 */
async function withStore(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    let req
    try {
      req = fn(store)
    } catch (err) {
      reject(err)
      return
    }
    tx.oncomplete = () => resolve(req && 'result' in req ? req.result : undefined)
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'))
  })
}

/**
 * @typedef {Object} OfflineTrackRecord
 * @property {number|string} id
 * @property {object} meta
 * @property {Blob} audioBlob
 * @property {Blob|null} [coverBlob]
 * @property {number} sizeBytes
 * @property {number} downloadedAt
 */

/**
 * @param {OfflineTrackRecord} record
 */
export async function putTrack(record) {
  await withStore('readwrite', (store) => store.put(record))
}

/**
 * @param {number|string} id
 * @returns {Promise<OfflineTrackRecord|undefined>}
 */
export async function getTrack(id) {
  return withStore('readonly', (store) => store.get(id))
}

/**
 * @returns {Promise<OfflineTrackRecord[]>}
 */
export async function listTracks() {
  return withStore('readonly', (store) => store.getAll())
}

/**
 * @param {number|string} id
 */
export async function deleteTrack(id) {
  await withStore('readwrite', (store) => store.delete(id))
}

export async function clearAll() {
  await withStore('readwrite', (store) => store.clear())
}

/**
 * @returns {Promise<number>}
 */
export async function sumBytes() {
  const all = await listTracks()
  return all.reduce((sum, row) => sum + (row.sizeBytes || 0), 0)
}

/**
 * @returns {Promise<{usage: number, quota: number}|null>}
 */
export async function estimateStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const est = await navigator.storage.estimate()
    return {
      usage: est.usage || 0,
      quota: est.quota || 0,
    }
  } catch {
    return null
  }
}
