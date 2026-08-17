import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

import {
  changedProjectFields,
  evaluateProjectFieldWrite,
  isProjectFieldEditable,
  LGU_OWNED_FIELDS,
  LGU_PHASE_STATUS,
  PPDO_OWNED_FIELDS,
  projectPayloadForActor,
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

const ppdoCreateZeroFilled = {
  ...ppdoCreate,
  progress_pct: 0,
  lgu_level: "",
  bid_price: 0,
  number_of_students: 0,
  contractor: "",
  planning_status: "",
  procurement_status: "",
  start_date: "",
  target_end_date: "",
  project_photos: [],
  resolution_file: [],
  supporting_docs: [],
  approval_status: "",
  approved_at: "",
  approved_by: "",
  rejection_reason: "",
  lgu_encoded_at: "",
  moa_file: [],
}

class BadRequestError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "BadRequestError"
  }
}

const jsOwnershipSandbox = {
  module: { exports: {} as Record<string, unknown> },
  exports: {} as Record<string, unknown>,
  BadRequestError,
}
runInNewContext(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../pb_hooks/project-field-ownership.js"
    ),
    "utf8"
  ),
  jsOwnershipSandbox
)
const jsOwnership = jsOwnershipSandbox.module.exports as {
  PPDO_OWNED_FIELDS: readonly string[]
  LGU_OWNED_FIELDS: readonly string[]
  evaluateProjectFieldWrite: typeof evaluateProjectFieldWrite
  applyProjectFieldOwnership: (event: unknown, isCreate: boolean) => void
}

function ownershipHookEvent(options: {
  superuser?: boolean
  role?: string
  fields?: Record<string, unknown>
  original?: Record<string, unknown>
}) {
  const next = vi.fn()
  const set = vi.fn()
  const fields = options.fields ?? {}
  return {
    next,
    set,
    event: {
      next,
      hasSuperuserAuth: () => options.superuser === true,
      auth: options.role
        ? { get: (field: string) => (field === "role" ? options.role : undefined) }
        : undefined,
      record: {
        get: (field: string) => fields[field],
        set,
        original: options.original ?? {},
      },
    },
  }
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

  it("allows PPDO create when PocketBase zero-fills unowned number fields", () => {
    const options = {
      role: "PPDO",
      isCreate: true,
      original: {},
      submitted: ppdoCreateZeroFilled,
    }
    const result = evaluateProjectFieldWrite(options)
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
    expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
  })

  it("rejects PPDO create when bid_price is stuffed above the PocketBase default", () => {
    const options = {
      role: "PPDO",
      isCreate: true,
      submitted: { ...ppdoCreate, bid_price: 1500 },
    }
    const result = evaluateProjectFieldWrite(options)
    expect(result).toEqual({
      ok: false,
      error: "You cannot update field 'bid_price'.",
    })
    expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
  })

  it("lets LGU write bid_price from 100 to 0", () => {
    const result = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        bid_price: 100,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { bid_price: 0 },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it("rejects PPDO writing bid_price from 100 to 0", () => {
    const options = {
      role: "PPDO",
      isCreate: false,
      original: { ...ppdoCreate, bid_price: 100 },
      submitted: { bid_price: 0 },
    }
    const result = evaluateProjectFieldWrite(options)
    expect(result).toEqual({
      ok: false,
      error: "You cannot update field 'bid_price'.",
    })
    expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
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

  it("lets PPDO edit number_of_students when the current category is Scholarship", () => {
    expect(
      isProjectFieldEditable(
        "PPDO",
        "number_of_students",
        { category: "Scholarship" },
        false
      )
    ).toBe(true)
    expect(
      isProjectFieldEditable(
        "PPDO",
        "number_of_students",
        { category: "Infrastructure" },
        false
      )
    ).toBe(false)
  })

  it("patches only fields the actor owns", () => {
    const submitted = {
      name: "Charter Bridge",
      contractor: "Build Co",
      progress_pct: 50,
      start_date: "2026-06-01",
    }

    expect(
      projectPayloadForActor("PPDO", ppdoCreate, false, submitted)
    ).toEqual({ name: "Charter Bridge" })
    expect(
      projectPayloadForActor("Municipality", ppdoCreate, false, submitted)
    ).toEqual({
      contractor: "Build Co",
      start_date: "2026-06-01",
    })
    expect(
      projectPayloadForActor("Province", ppdoCreate, false, submitted)
    ).toEqual(submitted)
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

describe("JS hook and TS ownership list parity", () => {
  it("keeps owned-field lists identical", () => {
    expect([...jsOwnership.PPDO_OWNED_FIELDS]).toEqual([...PPDO_OWNED_FIELDS])
    expect([...jsOwnership.LGU_OWNED_FIELDS]).toEqual([...LGU_OWNED_FIELDS])
  })

  it("matches evaluateProjectFieldWrite on the ownership cases", () => {
    const cases = [
      {
        role: "PPDO",
        isCreate: true,
        submitted: { ...ppdoCreate, progress_pct: 0 },
      },
      {
        role: "PPDO",
        isCreate: true,
        original: {},
        submitted: ppdoCreateZeroFilled,
      },
      {
        role: "PPDO",
        isCreate: true,
        submitted: { ...ppdoCreate, contractor: "Build Co" },
      },
      {
        role: "PPDO",
        isCreate: false,
        original: { ...ppdoCreate, lgu_encoded_at: "2026-08-01 00:00:00.000Z" },
        submitted: { status: "Procurement" },
      },
      {
        role: "Municipality",
        isCreate: false,
        original: { ...ppdoCreate, status: "Planning" },
        submitted: { contractor: "" },
      },
      {
        role: "Barangay",
        isCreate: false,
        original: {
          ...ppdoCreate,
          municipality: "Tuguegarao City",
          lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        },
        submitted: { municipality: "Lasam" },
      },
      {
        role: "Province",
        isCreate: false,
        original: ppdoCreate,
        submitted: { name: "Renamed", contractor: "Build Co" },
      },
    ] as const

    for (const options of cases) {
      expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(
        evaluateProjectFieldWrite(options)
      )
    }
  })
})

describe("JS applyProjectFieldOwnership request chain", () => {
  it("should call next once when Super Admin creates a project", () => {
    const { event, next, set } = ownershipHookEvent({ superuser: true })
    jsOwnership.applyProjectFieldOwnership(event, true)
    expect(set).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledOnce()
  })

  it("should call next once when Super Admin updates a project", () => {
    const { event, next } = ownershipHookEvent({
      superuser: true,
      original: { name: "Existing road" },
    })
    jsOwnership.applyProjectFieldOwnership(event, false)
    expect(next).toHaveBeenCalledOnce()
  })

  it("should set lgu_encoded_at then call next once when LGU updates", () => {
    const { event, next, set } = ownershipHookEvent({
      role: "Municipality",
    })
    jsOwnership.applyProjectFieldOwnership(event, false)
    expect(set).toHaveBeenCalledOnce()
    expect(set).toHaveBeenCalledWith("lgu_encoded_at", expect.any(String))
    expect(next).toHaveBeenCalledOnce()
    expect(set.mock.invocationCallOrder[0]).toBeLessThan(
      next.mock.invocationCallOrder[0]!
    )
  })

  it("should throw and skip next when the actor has no role", () => {
    const { event, next } = ownershipHookEvent({})
    expect(() => jsOwnership.applyProjectFieldOwnership(event, true)).toThrow(
      BadRequestError
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should throw and skip next when PPDO create stuffs contractor", () => {
    const { event, next, set } = ownershipHookEvent({
      role: "PPDO",
      fields: { contractor: "Build Co" },
    })
    expect(() => jsOwnership.applyProjectFieldOwnership(event, true)).toThrow(
      BadRequestError
    )
    expect(set).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })
})
