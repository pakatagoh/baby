# ─── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
# Ensure `.gitignore` is in the build context — Tailwind v4 reads it to exclude
# node_modules etc. from scanning. Without it, SSR and client builds produce
# different CSS (issue tailwindlabs/tailwindcss#19888).
ARG CACHE_BUST=0
RUN rm -rf node_modules/.vite .output node_modules/.nitro && pnpm build && pnpm verify:pwa

# ─── Production stage ─────────────────────────────────────────
FROM node:22-alpine

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
