import { describe, expect, it } from "vitest"

import {
  changedProjectFields,
  evaluateProjectFieldWrite,
  isProjectFieldEditable,
  LGU_OWNED_FIELDS,
  LGU_PHASE_STATUS,
  PPDO_OWNED_FIELDS,
  statusOptionsForActor,
} from "./project-field-ownership"

const ppdoCreate = {
  name: "Provincial road",
  category: "Infrastructure",
  status: "Planning",
  budget_year: 2026,
  municipality: "Tuguegarao City",
  location: "Tuguegarao City",
  description: "Charter encoding",
  total_budget: 1_000_000,
}

describe("project field ownership", () => {
  it("lets PPDO create without LGU-owned fields", () => {
    const result = evaluateProjectFieldWrite({
      role: "PPDO",
      isCreate: true,
      submitted: { ...ppdoCreate, progress_pct: 0, lgu_level: "Municipality" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it("rejects stuffed LGU-owned fields on PPDO create", () => {
    const result = evaluateProjectFieldWrite({
      role: "PPDO",
      isCreate: true,
      submitted: { ...ppdoCreate, contractor: "Build Co" },
    })
    expect(result).toEqual({
      ok: false,
      error: "You cannot update field 'contractor'.",
    })
  })

  it("lets PPDO set status until lgu_encoded_at is set", () => {
    const before = evaluateProjectFieldWrite({
      role: "PPDO",
      isCreate: false,
      original: { ...ppdoCreate, status: "Planning" },
      submitted: { status: "Procurement" },
    })
    expect(before.ok).toBe(true)

    const after = evaluateProjectFieldWrite({
      role: "PPDO",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "Planning",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { status: "Procurement" },
    })
    expect(after).toEqual({
      ok: false,
      error: "You cannot update field 'status'.",
    })
  })

  it("sets lgu_encoded_at on the first LGU save including a blank save", () => {
    const result = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: { ...ppdoCreate, status: "Planning" },
      submitted: { contractor: "" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: true })
  })

  it("does not infer first LGU save from empty contractor when the marker is already set", () => {
    const result = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        contractor: "",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { contractor: "Build Co" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it("rejects actor-supplied lgu_encoded_at including Super Admin", () => {
    const result = evaluateProjectFieldWrite({
      role: "Super Admin",
      isCreate: false,
      original: { ...ppdoCreate },
      submitted: { lgu_encoded_at: "2026-08-01 00:00:00.000Z" },
    })
    expect(result).toEqual({
      ok: false,
      error: "You cannot update field 'lgu_encoded_at'.",
    })
  })

  it("lets LGU echo a terminal status while saving other owned fields", () => {
    const result = evaluateProjectFieldWrite({
      role: "Barangay",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "Ready for Review",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        contractor: "",
      },
      submitted: { status: "Ready for Review", contractor: "Build Co" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it("rejects LGU changing status to or from a review or terminal state", () => {
    const toReview = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "Ongoing",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { status: "Ready for Review" },
    })
    expect(toReview.ok).toBe(false)

    const fromReview = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "For Revision",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { status: "Planning" },
    })
    expect(fromReview.ok).toBe(false)
  })

  it("lets LGU change among Planning, Procurement, and Ongoing after the marker", () => {
    const result = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "Planning",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { status: "Ongoing" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it("rejects LGU writes of PPDO-owned fields and municipality moves", () => {
    const budgetYear = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { budget_year: 2027 },
    })
    expect(budgetYear.ok).toBe(false)

    const move = evaluateProjectFieldWrite({
      role: "Barangay",
      isCreate: false,
      original: {
        ...ppdoCreate,
        municipality: "Tuguegarao City",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { municipality: "Lasam" },
    })
    expect(move).toEqual({
      ok: false,
      error: "You cannot update field 'municipality'.",
    })
  })

  it("rejects unowned omitted-table fields such as resolution_file", () => {
    const result = evaluateProjectFieldWrite({
      role: "PPDO",
      isCreate: false,
      original: ppdoCreate,
      submitted: { resolution_file: ["resolution.pdf"] },
    })
    expect(result).toEqual({
      ok: false,
      error: "You cannot update field 'resolution_file'.",
    })
  })

  it("rejects LGU writes of scholarship student count", () => {
    const result = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        category: "Scholarship",
        number_of_students: 10,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { number_of_students: 20 },
    })
    expect(result.ok).toBe(false)
  })

  it("lets Super Admin and Province mutate both sides without setting the marker", () => {
    const result = evaluateProjectFieldWrite({
      role: "Province",
      isCreate: false,
      original: ppdoCreate,
      submitted: { name: "Renamed", contractor: "Build Co" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it("does not treat unchanged echoed fields as writes", () => {
    expect(
      changedProjectFields(
        { contractor: "Build Co", budget_year: 2026 },
        { contractor: "Build Co", budget_year: 2026 }
      )
    ).toEqual([])
  })

  it("keeps Period of Implementation and LGU dates as distinct owned fields", () => {
    expect(PPDO_OWNED_FIELDS).toContain("period_of_implementation")
    expect(LGU_OWNED_FIELDS).toContain("start_date")
    expect(LGU_OWNED_FIELDS).toContain("target_end_date")
    expect(LGU_PHASE_STATUS).toEqual(["Not Started", "Ongoing", "Completed"])
  })

  it("does not offer Planning, Procurement, or Ongoing when LGU status is terminal", () => {
    const options = statusOptionsForActor(
      "Municipality",
      "Ready for Review",
      { status: "Ready for Review", lgu_encoded_at: "2026-08-01" },
      ["Planning", "Procurement", "Ongoing", "Ready for Review", "Completed"]
    )
    expect(options).toEqual(["Ready for Review"])
    expect(
      isProjectFieldEditable("Municipality", "status", {
        status: "Ready for Review",
        lgu_encoded_at: "2026-08-01",
      }, false)
    ).toBe(false)
  })
})
