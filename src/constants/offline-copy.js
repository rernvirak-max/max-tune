/**
 * Frozen Phase 1.5 Offline copy (Design handoff).
 * Use these constants everywhere — do not scatter string literals.
 */

export const OFFLINE_COPY = Object.freeze({
  action: Object.freeze({
    makeOffline: 'Make available offline',
    removeDownload: 'Remove download',
  }),
  state: Object.freeze({
    available: 'Available offline',
    downloading: 'Downloading…',
    downloadingPct: (n) => `Downloading ${n}%`,
    playlistProgress: (n, m) => `Downloading ${n} of ${m}`,
    playlistDone: 'Downloaded',
    sizeAbout: (size) => `About ${size}`,
    skippedLink: (k) => `Skipped ${k} link-only tracks (need network)`,
  }),
  err: Object.freeze({
    playOffline: 'Not available offline',
    playOfflineHint: 'Download this track when you’re back online.',
    downloadFail: 'Download failed · Tap to retry',
    storageFull: 'Storage full · Free space in Settings',
    wifiOnly: 'Downloads wait for Wi‑Fi (see Settings)',
    mutation: 'Connect to do that',
    linked: 'Needs network · Linked catalog track',
  }),
  banner: Object.freeze({
    browserOffline: 'You’re offline · Playing downloads only',
    engineDown: 'Can’t reach MaxTune · Playing downloads only',
  }),
  toast: Object.freeze({
    backOnline: 'Back online',
  }),
  filter: Object.freeze({
    all: 'All',
    downloaded: 'Downloaded',
  }),
  empty: Object.freeze({
    downloadedOnline: 'Nothing downloaded yet',
    downloadedHint: 'Make tracks available from a row or playlist',
    downloadedOffline: 'No offline tracks on this device',
  }),
  settings: Object.freeze({
    wifiOnly: 'Wi‑Fi only downloads',
    wifiOnlyHint:
      'When on, downloads wait for Wi‑Fi. Cellular stays for streaming if the network allows.',
    storageUsed: (used) => `${used} used`,
    storageSub: 'Audio kept on this device for offline play.',
    manage: 'Manage downloads',
    removeAll: 'Remove all downloads',
    removeAllTitle: 'Remove all downloads?',
    removeAllBody:
      'Deletes offline audio on this device. Your library in the cloud is unchanged.',
    iosNote:
      'iOS Safari / PWA: offline storage and background download are best-effort and may be cleared by the system. Android Chrome and desktop Chromium are the dogfood targets.',
  }),
  playlist: Object.freeze({
    download: 'Download playlist',
  }),
})

export const WIFI_ONLY_STORAGE_KEY = 'maxtune-wifi-only'
