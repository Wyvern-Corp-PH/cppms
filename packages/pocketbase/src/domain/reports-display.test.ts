import { describe, expect, it } from "vitest"

import {
  projectIdsWithLiquidationCertificate,
  reportLiquidationStatus,
} from "./reports-display"

describe("projectIdsWithLiquidationCertificate", () => {
  it("should include a project when any update has a certificate of liquidation", () => {
    const ids = projectIdsWithLiquidationCertificate([
      { project: "p-certified", certificate_of_liquidation: [] },
      {
        project: "p-certified",
        certificate_of_liquidation: ["liquidation-certificate.pdf"],
      },
      { project: "p-none", certificate_of_liquidation: [] },
      {
        project: "p-several",
        certificate_of_liquidation: ["one.pdf", "two.pdf"],
      },
    ])

    expect([...ids].sort()).toEqual(["p-certified", "p-several"])
  })
})

describe("reportLiquidationStatus", () => {
  it("should say Liquidated only when a certificate is on file", () => {
    expect(reportLiquidationStatus(true)).toBe("Liquidated")
    expect(reportLiquidationStatus(false)).toBe("—")
  })
})
