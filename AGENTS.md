# AGENTS.md

Guidance for AI coding agents (and future-you) working in this repo. Read this
before making changes.

## What this is

**Baby Tracker** — a web app for tracking frozen breast milk storage. Snap a
photo of a milk packet → AI vision reads the handwritten label → image is
saved + logged to a Google Sheet. Optimized images are served on the fly via
[imgproxy](https://imgproxy.net/).

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, SSR,
  file-based routing, server functions) on [Nitro](https://nitro.build/).
- **Styling:** Tailwind CSS v4 + shadcn/ui (no pre-built theme — components
  live in `src/components/ui/`).
- **Data:** TanStack Query (SSR-integrated via `@tanstack/react-router-ssr-query`)
  + Google Sheets as the database (OAuth token auth).
- **AI:** OpenCode AI (`minimax-m3` vision model) via Vercel AI SDK.
- **Images:** Sharp for upload-time resize/optimize; imgproxy for serve-time
  resize/crop with HMAC-signed URLs.
- **Deployment:** Docker → k3s (FluxCD HelmRelease using bjw-s `app-template`
  chart). The k3s manifests live in a **separate repo**
  (`github.com/pakatagoh/homelab` → `apps/baby/` + `infrastructure/imgproxy/`).
  This repo is the app source; the homelab repo is the GitOps deployment layer.

## Project layout

```
src/
├── components/
│   ├── ui/button.tsx              # shadcn/ui button (the only shadcn component so far)
│   ├── SnapMilkPacketButton.tsx   # Camera button + hidden file input
│   ├── PendingUploadList.tsx      # In-flight uploads (processing/done/error)
│   ├── StatusFilterChips.tsx      # "Active" / "Completed" / "All" + Filters toggle
│   ├── AdvancedFilters.tsx        # Expandable date/amount/packets filter panel
│   ├── EntryCard.tsx              # Single saved milk-packet row
│   ├── UploadPage.tsx             # Main page — orchestrates all of the above
│   └── Footer.tsx                 # Site footer
├── lib/
│   ├── ai.ts                      # Vision model: analyzeMilkPacket(base64) → {date,time,amount,packets,notes}
│   ├── images.ts                  # saveUpload() + generateImgproxyUrl() (HMAC-signed)
│   ├── sheets.ts                  # Google Sheets CRUD (OAuth, read/write, MilkStorageBackend interface)
│   ├── upload-fn.ts               # Server function: POST uploadMilk (FormData validator → processUpload)
│   ├── entries-fn.ts              # Server function: GET getEntries (→ sheets.getAll)
│   ├── process-upload.ts          # Serialised upload queue (save → imgproxy URL → AI analysis → sheet append)
│   └── utils.ts                   # cn() / clsx tailwind-merge helper
├── routes/
│   ├── __root.tsx                 # Root layout: <html> shell, HeadContent, devtools, Footer
│   ├── index.tsx                  # Home: prefetches entries, renders <UploadPage>
│   └── api/health.ts             # GET /api/health → { status: "ok", timestamp }
├── router.tsx                     # createRouter + QueryClient setup + SSR integration
├── routeTree.gen.ts              # Auto-generated route tree (DO NOT EDIT — run `pnpm generate-routes`)
└── styles.css                     # Tailwind entry point
```

## Upload pipeline (the core flow)

```
📸 Browser: user snaps photo
   │  FormData { image: File }
   ▼
🧵 upload-fn.ts (server function, POST)
   │  Validates: must be image, ≤ 20MB
   │  Calls processUpload(file)
   ▼
🔀 process-upload.ts (serialised queue — one-at-a-time to avoid sheet row clobber)
   │  1. saveUpload(file, "milk")         → writes optimised JPEG to IMAGE_ORIGINALS_DIR
   │  2. generateImgproxyUrl(path, 400)   → HMAC-signed URL for 400×400 thumbnail
   │  3. analyzeMilkPacket(base64, mime)  → AI vision reads label
   │  4. appendToSheet({date, time, …})   → Google Sheets row append
   │  Returns { previewUrl, result }
   ▼
🖥️ Browser: PendingUploadList shows status; on done, invalidates ["entries"] query
```

### Why the serialised queue?

`appendToSheet` reads the last used row (via `colAResult.values.length`) then
writes to `nextRow`. Two concurrent appends would both pick the same row and
clobber each other. The queue (`process-upload.ts` line ~19: `let chain:
Promise<unknown>`) serialises within one server process. If you ever run
multiple replicas, switch to the Sheets `values.append` API (atomic
end-of-table insert) instead.

## Key patterns

### Server functions (`createServerFn`)

All server-side logic goes through TanStack Start server functions. They are
the **only** bridge between client and server — there are no `/api/*` REST
endpoints (except `/api/health` for k8s probes).

- **`uploadMilk`** (`upload-fn.ts`): `POST`, takes `FormData`, validates with a
  sync function, handler dynamic-imports `process-upload` (which uses Node
  builtins like `sharp`, `fs` — keeps them out of the client bundle).
- **`getEntries`** (`entries-fn.ts`): `GET`, no validator, just calls
  `sheets.getAllEntries()`.

**Rule:** Server functions go in `src/lib/*-fn.ts` (not in route files). Keep
them thin — validation + call into a lib module that does the real work. Never
import Node builtins at the top level of a server function file (they get
tree-shaken by TanStack's import protection, but dynamic `import()` is safer
and the established pattern here).

### Environment variables

All env access is **per-request** (inside handler functions), never at module
scope. This is a TanStack Start requirement — module-scope `process.env` reads
at build time and leak between requests.

- `requireEnv(name)` in `sheets.ts` throws if a var is missing — use it for
  mandatory vars.
- Optional vars use `process.env.X || "default"`.
- See `.env.example` for the full list.

### Google Sheets as database

The `MilkStorageBackend` interface (`sheets.ts`) abstracts the storage layer.
The only implementation is `GoogleSheetsBackend`, but the interface exists so
you can swap in a test double or migrate to a real DB later.

- Sheet layout: row 1 = headers, rows 2+ = data. Columns: A=date, B=time,
  C=amount, D=packets, E=totalFrozen, F=totalUsed, G=notes, H=imageUrl.
- Dates are stored as `'15-Jul-26` (leading `'` to prevent Sheets
  auto-formatting). The `'` is stripped on read.
- Auth: OAuth 2.0 token file (path from `GOOGLE_TOKEN_PATH`). The token file
  is gitignored. Format: `{client_id, client_secret, redirect_uris, token,
  refresh_token}`.

### imgproxy URL signing

`generateImgproxyUrl()` in `images.ts` creates HMAC-SHA256 signed URLs. Both
the app and imgproxy must share the same `IMGPROXY_KEY` + `IMGPROXY_SALT` (hex-
encoded). The Docker Compose setup ensures this via the shared `.env` file.

URL format: `{base}/{signature}/{processing}/plain/{source}`
Example: `http://localhost:3000/img/AbCdEf.../rs:fit:400:0/plain/local:///images/originals/milk/2026-07/abc.jpg`

### TypeScript conventions

- **Never cast** to satisfy the compiler — fix the types instead. TanStack
  Router's type inference depends on the `Register` module augmentation in
  `router.tsx`.
- **`as const satisfies`** for filter option tuples (see `StatusFilterChips`).
- **Export types** that other components need (`PendingEntry`, `EntryFilter`,
  `NumOp`, `MilkSheetEntry`, `MilkPacketResult`).

## Docker Compose (local dev)

Two modes, matching the k3s production architecture:

| Mode | Command | What runs where |
|---|---|---|
| Full Docker | `docker compose up -d` | nginx + app (built from Dockerfile) + imgproxy |
| Hybrid dev | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` + `pnpm dev` | imgproxy + nginx in Docker, app on host with HMR |

In both modes, nginx mirrors the k3s Traefik ingress: `/` → app:3000, `/img` →
imgproxy:8080. The app is accessed at `http://localhost:3000`.

Key files: `docker-compose.yml`, `docker-compose.dev.yml`, `nginx.conf`,
`nginx.dev.conf`, `scripts/generate-imgproxy-keys.sh`.

## Hard rules

1. **Never commit `.env` or `google-token.json`.** Both are gitignored. They
   contain secrets (API keys, OAuth tokens, imgproxy signing keys).
2. **Never edit `routeTree.gen.ts` by hand.** It's auto-generated by
   `pnpm generate-routes` (driven by `@tanstack/router-plugin` in Vite). Edit
   route files in `src/routes/` and let the plugin regenerate.
3. **Server functions stay thin.** Validation + delegate to `src/lib/*.ts`.
   No business logic in route files or server function handlers.
4. **All server-side imports of Node builtins use dynamic `import()`.** This
   prevents them leaking into the client bundle. The pattern is established in
   `upload-fn.ts` → `process-upload.ts`.
5. **One-at-a-time sheet writes.** The serialised upload queue exists for a
   reason. If you rearchitect uploads, either keep serialisation or switch the
   sheet backend to `values.append` (atomic).
6. **imgproxy key/salt must be hex-encoded 32-byte values** (64 hex chars
   each). Generate with `./scripts/generate-imgproxy-keys.sh` or
   `openssl rand -hex 32`.

## Common tasks

### Add a new shadcn/ui component
```bash
pnpm dlx shadcn@latest add <component>
```
Components land in `src/components/ui/`. Import from `@/components/ui/<name>`.

### Run type checks
```bash
npx tsc --noEmit
```

### Run tests
```bash
pnpm test
```

### Generate imgproxy keys for dev
```bash
./scripts/generate-imgproxy-keys.sh
```
Writes `IMGPROXY_KEY` + `IMGPROXY_SALT` into `.env`.

### Test the full Docker stack locally
```bash
docker compose up -d
# App:   http://localhost:3000
# Health: http://localhost:3000/api/health
# imgproxy health: http://localhost:3000/img/health
```

### Deploy to k3s
The deployment is GitOps-driven from the **homelab repo**, not this one.

1. Build + push a new Docker image to `ghcr.io/pakatagoh/baby`:
   ```bash
   docker build -t ghcr.io/pakatagoh/baby:<tag> .
   docker push ghcr.io/pakatagoh/baby:<tag>
   ```
2. Update the image tag in `homelab/apps/baby/release.yaml` (or let Flux's
   image-automation pick it up if you push a semver tag).
3. Push to the homelab repo — Flux reconciles automatically.

## Known gotchas

- **Sharp in Docker:** The production Dockerfile installs `python3 make g++`
  in the final stage because `sharp` needs them at runtime for install scripts
  (not just build time). Don't remove them without testing.
- **`GOOGLE_SHEET_TAB` with spaces:** Wrap the value in quotes in `.env`
  (e.g. `GOOGLE_SHEET_TAB="Frozen Breast Milk"`). The Google Sheets API range
  syntax wraps the tab name in single quotes: `'Frozen Breast Milk'!A:A`.
- **imgproxy path prefix:** imgproxy has `IMGPROXY_PATH_PREFIX=/img`, so it
  expects requests at `/img/...`. The nginx config passes `/img/*` → imgproxy
  without stripping the prefix. If you change the prefix, update both
  `IMGPROXY_PATH_PREFIX` on the imgproxy container and `IMGPROXY_BASE_URL` on
  the app.
- **`host.docker.internal`** is used in `nginx.dev.conf` for hybrid dev mode.
  This works on Docker Desktop (macOS/Windows) but not on Linux. On Linux, use
  `--add-host=host.docker.internal:host-gateway` or switch to the full Docker
  stack.
- **Google Sheets rate limits:** The Sheets API has a 60 req/user/min quota.
  The `getEntries` call fetches all rows in one request (range `A2:H`), so
  it's fine for typical usage. But rapid-fire uploads + refetches could hit
  the limit — the serialised queue helps by spacing out `append` calls.
- **Date parsing:** Sheet dates are `DD-Mon-YY` (e.g. `15-Jul-26`). The
  `parseSheetDate` helper parses this format. If the date format changes in
  the sheet, update both the helper and the AI prompt in `ai.ts`.
- **`useServerFn` must be called at the top level** of a component (rules of
  hooks). The established pattern: `const uploadFn = useServerFn(uploadMilk)`
  at the top, then call `uploadFn({ data: form })` in event handlers.

<!-- intent-skills:start -->
# TanStack Intent - before editing files, run the matching guidance command.
tanstackIntent:
  - id: "@tanstack/devtools#devtools-app-setup"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-app-setup"
    for: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
  - id: "@tanstack/devtools#devtools-marketplace"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-marketplace"
    for: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
  - id: "@tanstack/devtools#devtools-plugin-panel"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-plugin-panel"
    for: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
  - id: "@tanstack/devtools#devtools-production"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-production"
    for: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
  - id: "@tanstack/devtools-event-client#devtools-bidirectional"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-bidirectional"
    for: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
  - id: "@tanstack/devtools-event-client#devtools-event-client"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-event-client"
    for: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
  - id: "@tanstack/devtools-event-client#devtools-instrumentation"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-instrumentation"
    for: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
  - id: "@tanstack/devtools-vite#devtools-vite-plugin"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-vite#devtools-vite-plugin"
    for: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
  - id: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#lifecycle/migrate-from-nextjs"
    for: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
  - id: "@tanstack/react-start#react-start"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#react-start"
    for: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
  - id: "@tanstack/react-start#react-start/server-components"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#react-start/server-components"
    for: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
  - id: "@tanstack/router-core#router-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core"
    for: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
  - id: "@tanstack/router-core#router-core/auth-and-guards"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/auth-and-guards"
    for: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
  - id: "@tanstack/router-core#router-core/code-splitting"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/code-splitting"
    for: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
  - id: "@tanstack/router-core#router-core/data-loading"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/data-loading"
    for: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
  - id: "@tanstack/router-core#router-core/navigation"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/navigation"
    for: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
  - id: "@tanstack/router-core#router-core/not-found-and-errors"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/not-found-and-errors"
    for: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
  - id: "@tanstack/router-core#router-core/path-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/path-params"
    for: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
  - id: "@tanstack/router-core#router-core/search-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/search-params"
    for: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
  - id: "@tanstack/router-core#router-core/ssr"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/ssr"
    for: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
  - id: "@tanstack/router-core#router-core/type-safety"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/type-safety"
    for: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
  - id: "@tanstack/router-plugin#router-plugin"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-plugin#router-plugin"
    for: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
  - id: "@tanstack/start-client-core#start-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core"
    for: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
  - id: "@tanstack/start-client-core#start-core/auth-server-primitives"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/auth-server-primitives"
    for: "Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via createServerFn and middleware, OAuth authorization-code flow with state and PKCE, password-reset enumeration defense, CSRF for non-GET RPCs, rate limiting auth endpoints, session rotation on privilege change. Pairs with router-core/auth-and-guards for the routing side."
  - id: "@tanstack/start-client-core#start-core/deployment"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/deployment"
    for: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
  - id: "@tanstack/start-client-core#start-core/execution-model"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/execution-model"
    for: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE_ prefix, process.env)."
  - id: "@tanstack/start-client-core#start-core/middleware"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/middleware"
    for: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
  - id: "@tanstack/start-client-core#start-core/server-functions"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions"
    for: "createServerFn (GET/POST), validator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
  - id: "@tanstack/start-client-core#start-core/server-routes"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-routes"
    for: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
  - id: "@tanstack/start-server-core#start-server-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-server-core#start-server-core"
    for: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
  - id: "@tanstack/virtual-file-routes#virtual-file-routes"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/virtual-file-routes#virtual-file-routes"
    for: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
<!-- intent-skills:end -->
