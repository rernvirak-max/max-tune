# syntax=docker/dockerfile:1
#
# MaxTune — Quasar PWA build served by nginx.
# Why: Nixpacks ships Node 22.19.0, but @quasar/app-vite 3.10 requires
# Node ^22.22.0 (or >=24), so `quasar prepare` (postinstall) fails.
# node:22-alpine tracks the latest Node 22 LTS (22.23.x as of 2026-09).

############################
# Stage 1: build
############################
FROM node:22-alpine AS build

WORKDIR /app

# Vite inlines VITE_* at build time → pass them as Coolify *build* variables.
# VITE_APP_MODE: local | staging | production (see src/helpers/api/apiConfig.js)
ARG VITE_APP_MODE=production
# Optional overrides (empty = use the per-mode defaults in apiConfig.js)
ARG VITE_ENGINE_URL=""
ARG VITE_ENGINE_PUBLIC_URL=""

ENV VITE_APP_MODE=${VITE_APP_MODE} \
    VITE_ENGINE_URL=${VITE_ENGINE_URL} \
    VITE_ENGINE_PUBLIC_URL=${VITE_ENGINE_PUBLIC_URL} \
    CI=true

# Fail fast with a clear message if the base image ever drops below 22.22
RUN node -e "const [a,b]=process.versions.node.split('.').map(Number);if(a===22&&b<22){console.error('Node '+process.versions.node+' < 22.22 required by @quasar/app-vite');process.exit(1)}"

# postinstall runs `quasar prepare`, which needs the full project
# (quasar.config.js, src/, src-pwa/, ...), so copy everything before install.
COPY . .
# NOTE: package-lock.json on main is missing `register-service-worker`, so
# `npm ci` refuses to run. `npm install` still honours the lockfile for every
# other package. Once the lockfile is re-synced (run `npm install` locally and
# commit it) this can be switched to `npm ci`.
RUN npm install --no-audit --no-fund

# Build the PWA → dist/pwa
RUN npx quasar build -m pwa

############################
# Stage 2: serve
############################
FROM nginx:alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/pwa /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
