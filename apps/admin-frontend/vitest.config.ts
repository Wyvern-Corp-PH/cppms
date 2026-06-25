import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vitest/config"

function uiInternalAlias(): Plugin {
  return {
    name: "ui-internal-alias",
    resolveId(source) {
      if (source === "@/hooks/use-mobile") {
        return path.resolve(
          __dirname,
          "../../packages/ui/src/hooks/use-mobile.ts"
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), uiInternalAlias()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    pool: "threads",
    testTimeout: 10000,
  },
  resolve: {
    alias: [
      { find: /^@\/hooks\/use-mobile$/, replacement: path.resolve(__dirname, "../../packages/ui/src/hooks/use-mobile.ts") },
      { find: "@workspace/pocketbase/schema", replacement: path.resolve(__dirname, "../../packages/pocketbase/schema/manifest.ts") },
      { find: "@workspace/pocketbase/domain/project-filters", replacement: path.resolve(__dirname, "../../packages/pocketbase/src/domain/project-filters.ts") },
      { find: "@workspace/pocketbase/domain/budget-summary", replacement: path.resolve(__dirname, "../../packages/pocketbase/src/domain/budget-summary.ts") },
      { find: "@workspace/pocketbase/domain/progress-summary", replacement: path.resolve(__dirname, "../../packages/pocketbase/src/domain/progress-summary.ts") },
      { find: "@workspace/pocketbase/domain/deadline-status", replacement: path.resolve(__dirname, "../../packages/pocketbase/src/domain/deadline-status.ts") },
      { find: "@workspace/pocketbase/domain/format-currency", replacement: path.resolve(__dirname, "../../packages/pocketbase/src/domain/format-currency.ts") },
      { find: "@workspace/pocketbase/types", replacement: path.resolve(__dirname, "../../packages/pocketbase/src/types.ts") },
      { find: "@workspace/pocketbase", replacement: path.resolve(__dirname, "../../packages/pocketbase/src") },
      { find: "@workspace/ui", replacement: path.resolve(__dirname, "../../packages/ui/src") },
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },
})
