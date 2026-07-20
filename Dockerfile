# ─── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN rm -rf node_modules/.vite .output && pnpm build

# ─── Production stage ─────────────────────────────────────────
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate && \
    apk add --no-cache python3 make g++

WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/.output ./.output

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
