/**
 * Friendly, user-facing error copy. Raw fetch / TypeError / server text never reaches the UI;
 * technical detail stays in the console (see helpers/userError.js).
 */

export const ERROR_COPY = Object.freeze({
  retry: 'Retry',
  generic: 'Something went wrong. Please try again.',
  unreachable: 'Can’t reach MaxTune right now. Check your connection and try again.',
  load: Object.freeze({
    library: 'Couldn’t load your library. Check your connection and try again.',
    liked: 'Couldn’t load your liked songs. Check your connection and try again.',
    playlists: 'Couldn’t load your playlists. Check your connection and try again.',
    playlist: 'Couldn’t load this playlist. Check your connection and try again.',
    search: 'Search isn’t available right now. Check your connection and try again.',
  }),
  action: Object.freeze({
    like: 'Couldn’t update like. Try again.',
    addToPlaylist: 'Couldn’t add to playlist. Try again.',
    deleteTrack: 'Couldn’t delete this track. Try again.',
    createPlaylist: 'Couldn’t create playlist. Try again.',
    renamePlaylist: 'Couldn’t rename playlist. Try again.',
    deletePlaylist: 'Couldn’t delete playlist. Try again.',
    removeFromPlaylist: 'Couldn’t remove from playlist. Try again.',
    importTrack: 'Couldn’t add to your library. Try again.',
    createInvite: 'Couldn’t create invite. Try again.',
    upload: 'Upload failed. Try again.',
    uploadNetwork: 'Upload failed · check your connection',
    play: 'Couldn’t play this track.',
    resume: 'Couldn’t resume playback.',
  }),
  auth: Object.freeze({
    login: 'Couldn’t sign you in. Please try again.',
    register: 'Couldn’t create your account. Please try again.',
  }),
})
