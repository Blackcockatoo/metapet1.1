import * as path from "node:path";
import { defineConfig } from "vitest/config";

const workspaceRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(workspaceRoot, "apps/web/src"),
      "@bluesnake-studios/addon-core": path.join(workspaceRoot, "packages/addon-core/src/index.ts"),
      "@bluesnake-studios/addon-crypto": path.join(workspaceRoot, "packages/addon-crypto/src/index.ts"),
      "@bluesnake-studios/addon-minting": path.join(workspaceRoot, "packages/addon-minting/src/index.ts"),
      "@bluesnake-studios/addon-store": path.join(workspaceRoot, "packages/addon-store/src/index.ts"),
      "@bluesnake-studios/moss60": path.join(workspaceRoot, "packages/moss60/src/index.ts"),
      "@bluesnake-studios/ui": path.join(workspaceRoot, "packages/ui/src/index.ts"),
      "@bluesnake-studios/config": path.join(workspaceRoot, "packages/config/src/index.ts")
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"]
    }
  }
});
