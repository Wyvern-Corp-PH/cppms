import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["schema/**/*.test.ts", "src/**/*.test.ts"],
  },
})
