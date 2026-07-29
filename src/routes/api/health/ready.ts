import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/health/ready")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { checkDatabase } = await import("../../../lib/db-health");
          checkDatabase();
          return json({ status: "ready" });
        } catch {
          return json({ status: "unready" }, 503);
        }
      },
    },
  },
});
