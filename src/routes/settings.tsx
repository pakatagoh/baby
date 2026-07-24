import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: () => (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 className="sr-only">⚙️ Settings</h1>
      <Outlet />
    </main>
  ),
});
