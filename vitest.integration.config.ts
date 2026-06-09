import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**"],
    environment: "node",
    passWithNoTests: true,
    // Integration tests run a real `vite build`, which needs more than the default timeout.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
