import { defineConfig, type Plugin } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const APP_SHELL_REVISION = new Date().toISOString();

function generatePwaWorkerOnlyForClient(plugins: Plugin[]) {
  const pwaBuildPlugin = plugins.find((plugin) => plugin.name === "vite-plugin-pwa:build");
  const closeBundle = pwaBuildPlugin?.closeBundle;

  if (!pwaBuildPlugin || !closeBundle || typeof closeBundle === "function") {
    throw new Error("vite-plugin-pwa build plugin must expose an object closeBundle hook");
  }

  const originalHandler = closeBundle.handler;
  pwaBuildPlugin.closeBundle = {
    ...closeBundle,
    async handler(error) {
      if (this.environment.name !== "client") {
        return;
      }
      return originalHandler.call(this, error);
    },
  };

  return plugins;
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    ...generatePwaWorkerOnlyForClient(
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        outDir: ".output/public",
        devOptions: {
          enabled: true,
        },
        includeAssets: ["favicon.ico", "robots.txt"],
        manifest: {
          name: "Baby Tracker",
          short_name: "Baby Tracker",
          description: "Track frozen breast milk storage",
          theme_color: "#7baf93",
          background_color: "#faf6f2",
          display: "standalone",
          orientation: "portrait-primary",
        },
        pwaAssets: {
          config: true,
          image: "public/baby-icon.png",
          overrideManifestIcons: true,
          integration: {
            outDir: ".output/public",
          },
        },
        injectManifest: {
          globDirectory: ".output/public",
          globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
          additionalManifestEntries: [{ url: "/", revision: APP_SHELL_REVISION }],
        },
      }),
    ),
  ],
});

export default config;
