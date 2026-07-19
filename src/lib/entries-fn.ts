import { createServerFn } from "@tanstack/react-start";
import { getAllEntries } from "./sheets";

// Read every milk-packet row from the Google Sheet. GET so it can be called
// from loaders / useQuery and preloaded on intent.
export const getEntries = createServerFn({ method: "GET" }).handler(
  async () => {
    return getAllEntries();
  },
);
