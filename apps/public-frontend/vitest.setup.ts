import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

vi.mock("@/hooks/use-pocketbase-realtime", () => ({
  usePocketBaseRealtime: () => ({ live: false }),
}))

afterEach(() => {
  cleanup()
})
