# Node's version pin alone does not remediate the eMudhra incident: its bundled
# roots still trust an affected chain. Update BOTH Alpine stores before Node
# makes HTTPS calls, and select only the OpenSSL/system store (not the additive
# --use-system-ca mode). The floor also invalidates pre-remediation cache layers.
FROM node:22.23.3-alpine AS trusted-node
RUN apk add --no-cache --upgrade \
    'ca-certificates>=20261020-r0' 'ca-certificates-bundle>=20261020-r0' && \
    update-ca-certificates
# Preserve caller-supplied build options while adding the required trust mode.
ARG NODE_OPTIONS
ENV NODE_OPTIONS="${NODE_OPTIONS} --use-openssl-ca" \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

# ─── Build stage ──────────────────────────────────────────────
FROM trusted-node AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
# TanStack prerendering starts the built server during image creation. The
# database plugin needs a writable build-time SQLite path; runtime deployments
# provide their own DATABASE_PATH.
ENV DATABASE_PATH=/tmp/baby-build.sqlite
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
# Ensure `.gitignore` is in the build context — Tailwind v4 reads it to exclude
# node_modules etc. from scanning. Without it, SSR and client builds produce
# different CSS (issue tailwindlabs/tailwindcss#19888).
ARG CACHE_BUST=0
RUN rm -rf node_modules/.vite .output node_modules/.nitro && pnpm build && pnpm verify:pwa

# ─── Production stage ─────────────────────────────────────────
FROM trusted-node

RUN corepack enable && corepack prepare pnpm@latest --activate && \
    apk add --no-cache python3 make g++

WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
