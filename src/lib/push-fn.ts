import { createServerFn } from "@tanstack/react-start";

export interface PublicVapidKeyResponse {
  vapidPublicKey: string;
}

export function publicVapidKeyResponse(vapidPublicKey: string): PublicVapidKeyResponse {
  return { vapidPublicKey };
}

/** Return only the public VAPID key from server runtime configuration. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicVapidKeyResponse> => {
    // Keep push-config out of the client graph: it contains the private-key
    // accessor and is loaded only when this server handler executes.
    const { getVapidPublicKey: readPublicKey } = await import("./push-config");
    return publicVapidKeyResponse(readPublicKey());
  },
);
