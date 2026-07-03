import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    setupFiles: ["./tests/env.setup.ts"],
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
