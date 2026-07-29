import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/health/startup")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { checkDatabase } = await import("../../../lib/db-health");
          const { isDatabaseStartupComplete } = await import("../../../lib/db-migrations");
          if (!isDatabaseStartupComplete()) return json({ status: "starting" }, 503);
          checkDatabase();
          return json({ status: "started" });
        } catch {
          return json({ status: "starting" }, 503);
        }
      },
    },
  },
});
