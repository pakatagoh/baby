import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerSW({ immediate: true });
  }, []);

  return null;
}
