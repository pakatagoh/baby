/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import {
  handleNotificationClick,
  handlePush,
} from "./sw-handlers";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<unknown>;
};

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/"), {
    denylist: [/^\/api(?:\/|$)/, /^\/img(?:\/|$)/],
  }),
);

self.addEventListener("push", (event) => {
  handlePush(event, self.registration);
});

self.addEventListener("notificationclick", (event) => {
  handleNotificationClick(event, self.clients, self.location.origin);
});
