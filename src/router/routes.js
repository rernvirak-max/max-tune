const routes = [
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guest: true },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/pages/auth/LoginPage.vue'),
      },
    ],
  },
  {
    path: '/register',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guest: true },
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('@/pages/auth/RegisterPage.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
      },
      {
        path: 'library',
        name: 'library',
        component: () => import('@/pages/LibraryPage.vue'),
      },
      {
        path: 'liked',
        name: 'liked',
        component: () => import('@/pages/LikedPage.vue'),
      },
      {
        path: 'playlists',
        name: 'playlists',
        component: () => import('@/pages/PlaylistsPage.vue'),
      },
      {
        path: 'playlists/:id',
        name: 'playlist-detail',
        component: () => import('@/pages/PlaylistDetailPage.vue'),
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/pages/SearchPage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/SettingsPage.vue'),
      },
      {
        path: 'admin',
        name: 'admin',
        redirect: { name: 'admin-invites' },
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/invites',
        name: 'admin-invites',
        component: () => import('@/pages/admin/AdminInvitesPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/pages/admin/AdminUsersPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/tracks',
        name: 'admin-tracks',
        component: () => import('@/pages/admin/AdminTracksPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/youtube',
        name: 'admin-youtube',
        component: () => import('@/pages/admin/AdminYoutubePage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/denied',
        name: 'admin-denied',
        component: () => import('@/pages/admin/AdminDeniedPage.vue'),
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
