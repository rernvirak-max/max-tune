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
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
