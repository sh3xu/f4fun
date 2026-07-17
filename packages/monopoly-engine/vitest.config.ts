import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // NOTE: forks pool hits spawn UNKNOWN on some Windows environments.
    pool: "threads",
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
