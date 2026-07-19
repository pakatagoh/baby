import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

// One QueryClient per browser session; a fresh client per server request so
// cached query state never leaks between users/requests during SSR.
let browserQueryClient: QueryClient | undefined
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  })
}
function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export interface RouterContext {
  queryClient: QueryClient
}

export function getRouter() {
  const queryClient = getQueryClient()
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: { queryClient },
  })

  // Wires TanStack Query into the router's SSR dehydrate/hydrate lifecycle and
  // auto-wraps the app in <QueryClientProvider> (via router.options.Wrap), so
  // queries run during SSR render are dehydrated and replayed on the client.
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
