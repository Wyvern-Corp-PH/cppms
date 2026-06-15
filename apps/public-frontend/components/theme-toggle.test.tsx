import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

const setTheme = vi.fn()

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme }),
}))

import { ThemeToggle } from "./theme-toggle"

describe("ThemeToggle (V60)", () => {
  it("renders toggle and switches to light on click", async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    const toggle = await screen.findByTestId("theme-toggle")
    expect(toggle).toHaveAttribute("aria-label", "Toggle color theme")

    await user.click(toggle)
    expect(setTheme).toHaveBeenCalledWith("light")
  })
})
