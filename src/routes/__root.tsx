import { useState } from "react";
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { RouterContext } from '../router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import BottomNav from '../components/BottomNav'
import { UploadModal } from '../components/UploadModal'

import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Baby Tracker',
      },
      {
        name: 'description',
        content: 'Track frozen breast milk storage',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        name: 'theme-color',
        content: '#7baf93',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon-180x180.png',
        sizes: '180x180',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/pwa-64x64.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/pwa-192x192.png',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        <div className="pb-20 [@media(display-mode:standalone)]:pb-28">{children}</div>
        <BottomNav onFileSelected={setSelectedFile} />
        <UploadModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
