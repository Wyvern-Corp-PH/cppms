import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LivePill } from "./live-pill"

describe("LivePill (V67)", () => {
  it("renders live indicator", () => {
    render(<LivePill />)
    expect(screen.getByTestId("live-pill")).toHaveTextContent("Live")
  })
})
