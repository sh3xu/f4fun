import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('vitest').UserConfig} */
export default {
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // NOTE: forks pool hits spawn UNKNOWN on some Windows environments.
    pool: "threads",
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
      // NOTE: Resolve workspace packages to source so Vitest works without a prior dist build.
      "@f4fun/monopoly-engine": path.resolve(
        root,
        "../../packages/monopoly-engine/src/index.ts",
      ),
      "@f4fun/shared-types": path.resolve(
        root,
        "../../packages/shared-types/src/index.ts",
      ),
    },
  },
};
