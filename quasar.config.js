// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app'

export default defineConfig((/* ctx */) => {
  return {
    boot: ['api', 'auth', 'offline'],
    css: ['app.css'],
    extras: [
      'material-icons',
    ],
    build: {
      target: {
      },
      vueRouterMode: 'hash',
      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },
    devServer: {
      open: false,
      host: '127.0.0.1',
      port: 9100,
      proxy: {
        '/engine': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/engine/, ''),
        },
      },
    },
    framework: {
      config: {
        brand: {
          primary: '#3dffb5',
          secondary: '#12141c',
          accent: '#ff7a45',
          dark: '#07080c',
          'dark-page': '#07080c',
          positive: '#3dffb5',
          negative: '#ff6b6b',
          info: '#5ec8ff',
          warning: '#ffb020',
        },
        dark: true,
      },
      plugins: ['Notify', 'Dialog'],
    },
    animations: ['fadeIn', 'fadeInUp'],
    ssr: {
      prodPort: 3000,
      middlewares: [
        'render',
      ],
    },
    ssg: {
    },
    pwa: {
      workboxMode: 'GenerateSW',
      manifestFilename: 'manifest.json',
      extendPWAManifestJson(json) {
        json.name = 'MaxTune'
        json.short_name = 'MaxTune'
        json.description = 'Your private listening room'
        json.display = 'standalone'
        json.orientation = 'portrait'
        json.background_color = '#07080c'
        json.theme_color = '#07080c'
        json.categories = ['music', 'entertainment']
      },
      extendPWAGenerateSWOptions(cfg) {
        cfg.skipWaiting = true
        cfg.clientsClaim = true
        cfg.cleanupOutdatedCaches = true
        cfg.navigateFallback = 'index.html'
        cfg.navigateFallbackDenylist = [/^\/engine/, /^\/api/]
      },
    },
    cordova: {},
    capacitor: {
      hideSplashscreen: true,
    },
    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {
      },
      builder: {
        appId: 'max-tune',
      },
    },
    bex: {
      extraScripts: [],
    },
  }
})
