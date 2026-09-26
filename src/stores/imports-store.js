import { defineStore } from 'pinia'
import { Notify, Screen } from 'quasar'
import { YOUTUBE_COPY } from '@/constants/youtube-copy'
import { isAppOffline } from '@/composables/useConnectivity'
import {
  dismissImport,
  listImports,
  retryImport,
  submitYoutubeImport,
} from '@/services/engine/imports'
import { getTrack } from '@/services/engine/tracks'
import { useLibraryStore } from '@/stores/library-store'
import { usePlayerStore } from '@/stores/player-store'

const ACTIVE_STATUSES = ['queued', 'downloading', 'processing']
/** Spec AC16: poll every 3s while anything is active */
const POLL_INTERVAL_MS = 3000
/** How long a just-imported track keeps its NEW pill + mint wash */
const FRESH_HIGHLIGHT_MS = 4000
/** More simultaneous finishes than this collapse into one "Added n tracks" toast */
const MAX_READY_TOASTS = 2
const TOAST_TIMEOUT_MS = 3000
/** Desktop toasts sit above the 84px player bar */
const DESKTOP_TOAST_OFFSET = [16, 100]

let pollTimer = null
let listenersBound = false
/** The list request in flight; polls and resumes share it instead of overlapping. */
let inFlight = null
/** Bumped by stop(): results of requests started before it are dropped. */
let session = 0

const isActive = (row) => ACTIVE_STATUSES.includes(row.status)
const newestFirst = (a, b) =>
  String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id

function notify(options) {
  Notify.create({
    color: 'dark',
    timeout: TOAST_TIMEOUT_MS,
    position: Screen.xs ? 'top' : 'bottom-right',
    offset: Screen.xs ? undefined : DESKTOP_TOAST_OFFSET,
    ...options,
  })
}

export const useImportsStore = defineStore('imports', {
  state: () => ({
    list: [],
    loaded: false,
    freshTrackIds: [],
    /** Optimistically dismissed rows; a poll that raced the DELETE must not bring them back. */
    dismissedIds: [],
  }),

  getters: {
    /** Imports group rows: active (newest first), then failed (newest first); ready rows leave. */
    visible: (state) => [
      ...state.list.filter(isActive).sort(newestFirst),
      ...state.list.filter((row) => row.status === 'failed').sort(newestFirst),
    ],
    activeCount: (state) => state.list.filter(isActive).length,
  },

  actions: {
    fetch() {
      this.bindListeners()
      if (inFlight) return inFlight
      const request = this.load(session).finally(() => {
        if (inFlight === request) inFlight = null
      })
      inFlight = request
      return request
    },

    /** One list request; toasts only for rows this client saw active before. */
    async load(startedIn) {
      let rows = null
      try {
        rows = await listImports('all')
      } catch (err) {
        // Rows keep their last known state; the next poll or resume tries again.
        console.warn('[maxtune] imports load failed', err)
      }
      if (startedIn !== session) return

      this.loaded = true
      if (rows) {
        const previous = new Map(this.list.map((row) => [row.id, row.status]))
        this.list = rows.filter((row) => !this.dismissedIds.includes(row.id))

        const settled = this.list.filter((row) => ACTIVE_STATUSES.includes(previous.get(row.id)))
        this.announceReady(settled.filter((row) => row.status === 'ready'))
        settled
          .filter((row) => row.status === 'failed')
          .forEach((row) =>
            notify({ message: YOUTUBE_COPY.toastFailed(row.title || row.video_id) }),
          )
      }

      this.syncPolling()
    },

    /** Logout / 401: stop polling and forget this user's imports. */
    stop() {
      clearInterval(pollTimer)
      pollTimer = null
      inFlight = null
      session += 1
      this.$reset()
    },

    /**
     * @param {string} url raw trimmed link
     */
    async submit(url) {
      const row = await submitYoutubeImport(url)
      this.list.unshift(row)
      notify({ icon: 'schedule', message: YOUTUBE_COPY.toastQueued })
      this.syncPolling()
      return row
    },

    /** Optimistic: the row goes back to Queued at once and is restored if the engine refuses. */
    async retry(id) {
      const row = this.list.find((item) => item.id === id)
      if (!row) return
      const snapshot = { ...row }
      Object.assign(row, { status: 'queued', reason_code: null })
      try {
        Object.assign(row, await retryImport(id))
        this.syncPolling()
      } catch (err) {
        Object.assign(row, snapshot)
        throw err
      }
    },

    /** Optimistic removal, restored on failure. */
    async dismiss(id) {
      const snapshot = [...this.list]
      this.list = this.list.filter((item) => item.id !== id)
      this.dismissedIds.push(id)
      try {
        await dismissImport(id)
      } catch (err) {
        this.dismissedIds = this.dismissedIds.filter((dismissed) => dismissed !== id)
        this.list = snapshot
        throw err
      }
    },

    /**
     * Put finished tracks at the top of the Library with a short NEW highlight and toast.
     * @param {Array<{ track_id: number }>} rows
     */
    async announceReady(rows) {
      if (!rows.length) return
      const startedIn = session
      const library = useLibraryStore()
      const player = usePlayerStore()
      const tracks = (
        await Promise.all(rows.map((row) => getTrack(row.track_id).catch(() => null)))
      ).filter(Boolean)
      if (startedIn !== session) return

      tracks.forEach((track) => {
        library.prependTrack(track)
        this.freshTrackIds.push(track.id)
        setTimeout(() => {
          this.freshTrackIds = this.freshTrackIds.filter((id) => id !== track.id)
        }, FRESH_HIGHLIGHT_MS)
      })

      if (tracks.length > MAX_READY_TOASTS) {
        notify({ message: YOUTUBE_COPY.toastReadyMany(tracks.length), icon: 'check_circle' })
        return
      }

      tracks.forEach((track) =>
        notify({
          message: YOUTUBE_COPY.toastReady(track.title),
          icon: 'check_circle',
          actions: [
            {
              label: YOUTUBE_COPY.toastPlay,
              color: 'primary',
              noCaps: true,
              handler: () => {
                const index = library.tracks.findIndex((item) => item.id === track.id)
                player.playQueue(library.tracks, Math.max(index, 0))
              },
            },
          ],
        }),
      )
    },

    /** Poll only while something is active, the tab is visible and the engine is reachable. */
    syncPolling() {
      const shouldPoll = this.activeCount > 0 && !document.hidden && !isAppOffline()
      if (shouldPoll && !pollTimer) {
        pollTimer = setInterval(() => this.fetch(), POLL_INTERVAL_MS)
      } else if (!shouldPoll && pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    },

    /** Resume with an immediate fetch when the tab becomes visible or the browser comes back online. */
    bindListeners() {
      if (listenersBound || typeof window === 'undefined') return
      listenersBound = true
      const resume = () => {
        if (document.hidden || !this.activeCount) {
          this.syncPolling()
          return
        }
        this.fetch()
      }
      document.addEventListener('visibilitychange', resume)
      window.addEventListener('online', resume)
      window.addEventListener('offline', () => this.syncPolling())
    },
  },
})
