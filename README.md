# 🍼 Baby Tracker

A web app for tracking frozen breast milk storage. Snap a photo of a milk packet, and the app uses AI vision to read the handwritten label (date, time, amount), saves the image, and logs everything to a Google Sheet. Optimized images are served on the fly via [imgproxy](https://imgproxy.net/).

## How it works

```
📸 Snap photo  →  🧠 AI reads label  →  📊 Row appended to Google Sheets
                          │
                          ▼
                  🖼️ Image saved to disk
                          │
                          ▼
                  🌐 Served via imgproxy (resize/crop on the fly)
```

1. **Capture** — tap the camera button, snap a picture of a frozen milk packet.
2. **Analyze** — the image is sent to a vision model that extracts date, time, amount (ml), and packet count from the handwritten label.
3. **Store** — the optimized JPEG is saved to disk and a signed imgproxy URL is generated. The extracted data is appended to a Google Sheet.
4. **Browse** — the UI shows every logged packet with its photo, pulled from the sheet. Filter by status, date range, amount, or packet count.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 + SSR) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based, type-safe) |
| Data fetching | [TanStack Query](https://tanstack.com/query) with SSR integration |
| Server runtime | [Nitro](https://nitro.build/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| AI / Vision | [OpenCode AI](https://opencode.ai/) (`minimax-m3` model) via [Vercel AI SDK](https://sdk.vercel.ai/) |
| Image processing | [Sharp](https://sharp.pixelplumbing.com/) (resize + optimize on upload) |
| Image serving | [imgproxy](https://imgproxy.net/) (on-the-fly resize/crop with signed URLs) |
| Database | Google Sheets (yes, really — it's simple and shareable) |
| Deployment | Docker → k3s (FluxCD + Helm) |

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** (enabled via corepack)
- **Docker** (for imgproxy and production-like testing)
- A **Google Cloud project** with Sheets API enabled and an OAuth token (see [google-token.json](#google-tokenjson))
- An **OpenCode AI** API key

## Getting started

### 1. Clone and install

```bash
git clone <repo-url> baby
cd baby
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Fill in the required values in `.env`:

| Variable | Description |
|---|---|
| `GOOGLE_SHEET_ID` | The Google Sheet ID (from the sheet URL) |
| `GOOGLE_SHEET_TAB` | The tab/sheet name (e.g. `Frozen Breast Milk`) |
| `GOOGLE_TOKEN_PATH` | Path to a Google OAuth token JSON file (default: `./google-token.json`) |
| `OPENCODE_API_KEY` | API key from [OpenCode](https://opencode.ai/) |
| `IMAGE_ORIGINALS_DIR` | Where uploaded images are stored (default: `./data/images/originals`) |
| `IMGPROXY_BASE_URL` | Base URL for imgproxy (default: `http://localhost:3000/img`) |
| `IMGPROXY_KEY` | 64-char hex key for imgproxy URL signing |
| `IMGPROXY_SALT` | 64-char hex salt for imgproxy URL signing |

### 3. Generate imgproxy keys

```bash
./scripts/generate-imgproxy-keys.sh
```

This creates `IMGPROXY_KEY` and `IMGPROXY_SALT` and writes them into your `.env`.

### 4a. Local dev with hot reload

Run imgproxy + nginx in Docker, and the app on your host with hot module replacement:

```bash
# Terminal 1 — start imgproxy + reverse proxy
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Terminal 2 — start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4b. Full Docker stack (production-like)

```bash
docker compose up -d
```

This builds the app image and runs nginx + app + imgproxy together, just like the k3s deployment. Open [http://localhost:3000](http://localhost:3000).

## google-token.json

The app authenticates to Google Sheets using an OAuth token file. Create a Google Cloud project, enable the Sheets API, and generate an OAuth 2.0 refresh token. The file should look like:

```json
{
  "client_id": "…",
  "client_secret": "…",
  "redirect_uris": ["http://localhost"],
  "token": "ya29.…",
  "refresh_token": "1//…"
}
```

Place it at the path specified by `GOOGLE_TOKEN_PATH` (default: `./google-token.json`). This file is gitignored.

## Project structure

```
src/
├── components/
│   ├── ui/button.tsx        # shadcn/ui button
│   ├── Footer.tsx           # Site footer
│   └── UploadPage.tsx       # Main page: camera, uploads, saved entries
├── lib/
│   ├── ai.ts                # Vision model (reads milk packet labels)
│   ├── entries-fn.ts        # Server function: fetch all entries
│   ├── images.ts            # Image save + imgproxy URL generation
│   ├── process-upload.ts    # Upload pipeline (serialised queue)
│   ├── sheets.ts            # Google Sheets read/write
│   ├── upload-fn.ts         # Server function: upload + analyse
│   └── utils.ts             # Tailwind classname helpers
├── routes/
│   ├── __root.tsx           # Root layout (HTML shell, devtools)
│   ├── index.tsx            # Home page route
│   └── api/health.ts        # Health check endpoint
├── router.tsx               # TanStack Router + Query client setup
├── routeTree.gen.ts         # Auto-generated route tree
└── styles.css               # Tailwind entry point

docker-compose.yml           # Full stack: nginx + app + imgproxy
docker-compose.dev.yml       # Dev override (app on host, imgproxy in Docker)
nginx.conf                    # nginx config (mirrors k3s Traefik routing)
nginx.dev.conf                # nginx config for hybrid dev
scripts/
└── generate-imgproxy-keys.sh
Dockerfile                    # Multi-stage production build
```

## Deployment (k3s)

The app is deployed to a k3s cluster via FluxCD. The manifests live in a [separate homelab repo](https://github.com/pakatagoh/homelab):

```
homelab/
├── apps/baby/               # HelmRelease, namespace, image policy
└── infrastructure/imgproxy/ # imgproxy HelmRelease, namespace
```

Both services share a hostPath volume (`/mnt/media/images`) and are exposed behind a single Traefik ingress:

| Path | Service | Port |
|---|---|---|
| `/` | baby app | 3000 |
| `/img` | imgproxy | 8080 |

The Docker Compose setup above mirrors this exactly with nginx standing in for Traefik.

## API

### `GET /api/health`

Health check endpoint. Returns `{ "status": "ok", "timestamp": "…" }`.

Also available from imgproxy at `/img/health`.
