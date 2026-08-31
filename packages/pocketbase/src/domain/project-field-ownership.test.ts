import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

import {
  awaitingDetailsBadgeCopy,
  changedProjectFields,
  evaluateProjectFieldWrite,
  isProjectFieldEditable,
  LGU_OWNED_FIELDS,
  LGU_OVERRIDE_LOCKED_FIELDS,
  LGU_PHASE_STATUS,
  ownedProjectFieldsForActor,
  PROVINCIAL_OWNED_FIELDS,
  projectFieldFilledByLabel,
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
}

const ppdoCreateZeroFilled = {
  ...ppdoCreate,
  progress_pct: 0,
  lgu_level: "",
  bid_price: 0,
  number_of_students: 0,
  contractor: "",
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
  PROVINCIAL_OWNED_FIELDS: readonly string[]
  LGU_OWNED_FIELDS: readonly string[]
  LGU_OVERRIDE_LOCKED_FIELDS: readonly string[]
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
  it("lets Province create without LGU-owned fields", () => {
    const result = evaluateProjectFieldWrite({
      role: "Province",
      isCreate: true,
      submitted: { ...ppdoCreate, progress_pct: 0, lgu_level: "Municipality" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it("rejects a retired PPDO role from writing projects", () => {
    const result = evaluateProjectFieldWrite({
      role: "PPDO",
      isCreate: true,
      submitted: { ...ppdoCreate, contractor: "Build Co" },
    })
    expect(result).toEqual({
      ok: false,
      error: "You cannot update this project.",
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
        status: "For Completion",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        contractor: "",
      },
      submitted: { status: "For Completion", contractor: "Build Co" },
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
      submitted: { status: "For Completion" },
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

  it("lets LGU write Cancelled from a non-terminal status", () => {
    const result = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "Planning",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { status: "Cancelled" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
    expect(
      jsOwnership.evaluateProjectFieldWrite({
        role: "Municipality",
        isCreate: false,
        original: {
          ...ppdoCreate,
          status: "Planning",
          lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        },
        submitted: { status: "Cancelled" },
      })
    ).toEqual(result)
  })

  it("freezes Cancelled so LGU cannot leave it", () => {
    const result = evaluateProjectFieldWrite({
      role: "Barangay",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "Cancelled",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { status: "Planning" },
    })
    expect(result.ok).toBe(false)
    expect(
      jsOwnership.evaluateProjectFieldWrite({
        role: "Barangay",
        isCreate: false,
        original: {
          ...ppdoCreate,
          status: "Cancelled",
          lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        },
        submitted: { status: "Planning" },
      }).ok
    ).toBe(false)
  })

  it("rejects LGU writing For Approval", () => {
    const result = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        status: "For Completion",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { status: "For Approval" },
    })
    expect(result.ok).toBe(false)
  })

  it("rejects LGU writes of provincial-owned fields and municipality moves", () => {
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

    const fundingYear = evaluateProjectFieldWrite({
      role: "Municipality",
      isCreate: false,
      original: {
        ...ppdoCreate,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      },
      submitted: { funding_year: 2025, sub_account: "GF - Proper" },
    })
    expect(fundingYear).toEqual({
      ok: false,
      error: "You cannot update field 'funding_year'.",
    })

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

  it.each(["Province", "Super Admin"] as const)(
    "should allow %s to write resolution and supporting document files",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "Ongoing",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      }
      for (const field of ["resolution_file", "supporting_docs"] as const) {
        const options = {
          role,
          isCreate: false,
          original,
          submitted: { [field]: ["doc.pdf"] },
        }
        expect(evaluateProjectFieldWrite(options)).toEqual({
          ok: true,
          setLguEncodedAt: false,
        })
        expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual({
          ok: true,
          setLguEncodedAt: false,
        })
      }
    }
  )

  it.each(["Municipality", "Barangay"] as const)(
    "should reject %s writes of MOA, resolution, and supporting document files",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "Ongoing",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      }
      for (const field of [
        "moa_file",
        "resolution_file",
        "supporting_docs",
      ] as const) {
        expect(
          evaluateProjectFieldWrite({
            role,
            isCreate: false,
            original,
            submitted: { [field]: ["doc.pdf"] },
          })
        ).toEqual({
          ok: false,
          error: `You cannot update field '${field}'.`,
        })
      }
    }
  )

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

  it("allows Province create when PocketBase zero-fills unowned number fields", () => {
    const options = {
      role: "Province",
      isCreate: true,
      original: {},
      submitted: ppdoCreateZeroFilled,
    }
    const result = evaluateProjectFieldWrite(options)
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
    expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
  })

  it("lets Province include bid_price on create", () => {
    const options = {
      role: "Province",
      isCreate: true,
      submitted: { ...ppdoCreate, bid_price: 1500 },
    }
    const result = evaluateProjectFieldWrite(options)
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
    expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
  })

  it("lets LGU write start and end dates", () => {
    const original = {
      ...ppdoCreate,
      status: "Ongoing",
      start_date: "2026-06-01",
      target_end_date: "2026-12-01",
    }
    expect(
      evaluateProjectFieldWrite({
        role: "Municipality",
        isCreate: false,
        original,
        submitted: { start_date: "2026-07-01", target_end_date: "2026-11-01" },
      })
    ).toEqual({ ok: true, setLguEncodedAt: true })
    expect(
      projectPayloadForActor("Municipality", original, false, {
        start_date: "2026-07-01",
        target_end_date: "2026-11-01",
        name: "Provincial road",
      })
    ).toEqual({
      start_date: "2026-07-01",
      target_end_date: "2026-11-01",
    })
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

  it("rejects Province writing bid_price from 100 to 0", () => {
    const options = {
      role: "Province",
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

  it("lets Super Admin and Province mutate provincial-owned fields without setting the marker", () => {
    const result = evaluateProjectFieldWrite({
      role: "Province",
      isCreate: false,
      original: ppdoCreate,
      submitted: { name: "Renamed", fund_source: "General Fund" },
    })
    expect(result).toEqual({ ok: true, setLguEncodedAt: false })
  })

  it.each(["Province", "Super Admin"] as const)(
    "rejects %s changing LGU-owned status, contractor, bid price, or dates",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "Ongoing",
        contractor: "Build Co",
        bid_price: 100,
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
      }
      for (const [field, value] of [
        ["status", "Planning"],
        ["contractor", "Other Co"],
        ["bid_price", 200],
        ["start_date", "2026-07-01"],
        ["target_end_date", "2026-11-01"],
      ] as const) {
        const result = evaluateProjectFieldWrite({
          role,
          isCreate: false,
          original,
          submitted: { [field]: value },
        })
        expect(result).toEqual({
          ok: false,
          error: `You cannot update field '${field}'.`,
        })
        expect(jsOwnership.evaluateProjectFieldWrite({
          role,
          isCreate: false,
          original,
          submitted: { [field]: value },
        })).toEqual(result)
      }
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "lets %s write Completed status when approval_status is on the same payload",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "For Completion",
        approval_status: "pending",
      }
      const options = {
        role,
        isCreate: false,
        original,
        submitted: {
          status: "Completed",
          approval_status: "approved",
          approved_by: "province-user",
          approved_at: "2026-08-19",
        },
      }
      const result = evaluateProjectFieldWrite(options)
      expect(result).toEqual({ ok: true, setLguEncodedAt: false })
      expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "still rejects %s Edit-only status writes without approval_status",
    (role) => {
      const options = {
        role,
        isCreate: false,
        original: { ...ppdoCreate, status: "Ongoing" },
        submitted: { status: "Planning" },
      }
      const result = evaluateProjectFieldWrite(options)
      expect(result).toEqual({
        ok: false,
        error: "You cannot update field 'status'.",
      })
      expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "rejects %s mismatched approval_status and status pairs",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "For Completion",
        approval_status: "pending",
      }
      for (const submitted of [
        { status: "Planning", approval_status: "approved" },
        { status: "Ongoing", approval_status: "pending" },
        { status: "Completed", approval_status: "rejected" },
        { status: "Rejected", approval_status: "approved" },
        { status: "For Revision", approval_status: "approved" },
      ]) {
        const options = { role, isCreate: false, original, submitted }
        const result = evaluateProjectFieldWrite(options)
        expect(result).toEqual({
          ok: false,
          error: "You cannot update field 'status'.",
        })
        expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
      }
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "lets %s write Rejected status when approval_status is rejected",
    (role) => {
      const options = {
        role,
        isCreate: false,
        original: {
          ...ppdoCreate,
          status: "For Completion",
          approval_status: "pending",
        },
        submitted: {
          status: "Rejected",
          approval_status: "rejected",
          rejection_reason: "Incomplete liquidation package.",
        },
      }
      const result = evaluateProjectFieldWrite(options)
      expect(result).toEqual({ ok: true, setLguEncodedAt: false })
      expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "lets %s write status-only For Approval from For Completion while pending",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "For Completion",
        approval_status: "pending",
      }
      const options = {
        role,
        isCreate: false,
        original,
        submitted: { status: "For Approval" },
      }
      const result = evaluateProjectFieldWrite(options)
      expect(result).toEqual({ ok: true, setLguEncodedAt: false })
      expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "rejects %s status-only For Approval when original approval_status is empty or missing",
    (role) => {
      for (const approval_status of ["", undefined] as const) {
        const original = {
          ...ppdoCreate,
          status: "For Completion",
          ...(approval_status === undefined ? {} : { approval_status }),
        }
        const options = {
          role,
          isCreate: false,
          original,
          submitted: { status: "For Approval" },
        }
        const result = evaluateProjectFieldWrite(options)
        expect(result).toEqual({
          ok: false,
          error: "You cannot update field 'status'.",
        })
        expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
      }
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "lets %s write companion approval statuses when original approval_status is empty or missing",
    (role) => {
      for (const approval_status of ["", undefined] as const) {
        const original = {
          ...ppdoCreate,
          status: "For Completion",
          ...(approval_status === undefined ? {} : { approval_status }),
        }
        for (const submitted of [
          {
            status: "Completed",
            approval_status: "approved",
            approved_by: "province-user",
            approved_at: "2026-08-19",
          },
          {
            status: "Rejected",
            approval_status: "rejected",
            rejection_reason: "Incomplete liquidation package.",
          },
          { status: "For Revision", approval_status: "pending" },
        ]) {
          const options = { role, isCreate: false, original, submitted }
          const result = evaluateProjectFieldWrite(options)
          expect(result).toEqual({ ok: true, setLguEncodedAt: false })
          expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
        }
      }
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "rejects %s For Approval write from a status other than For Completion",
    (role) => {
      const options = {
        role,
        isCreate: false,
        original: {
          ...ppdoCreate,
          status: "Ongoing",
          approval_status: "pending",
        },
        submitted: { status: "For Approval" },
      }
      const result = evaluateProjectFieldWrite(options)
      expect(result).toEqual({
        ok: false,
        error: "You cannot update field 'status'.",
      })
      expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "lets %s write For Revision when approval_status stays or is set pending",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "For Completion",
        approval_status: "pending",
      }
      for (const submitted of [
        { status: "For Revision" },
        { status: "For Revision", approval_status: "pending" },
      ]) {
        const options = { role, isCreate: false, original, submitted }
        const result = evaluateProjectFieldWrite(options)
        expect(result).toEqual({ ok: true, setLguEncodedAt: false })
        expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual(result)
      }
    }
  )

  it.each(["Province", "Super Admin"] as const)(
    "lets %s echo unchanged LGU-owned fields while saving other overrides",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "Ongoing",
        contractor: "Build Co",
        bid_price: 100,
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
      }
      const result = evaluateProjectFieldWrite({
        role,
        isCreate: false,
        original,
        submitted: {
          name: "Renamed",
          status: "Ongoing",
          contractor: "Build Co",
          bid_price: 100,
          start_date: "2026-06-01",
          target_end_date: "2026-12-01",
        },
      })
      expect(result).toEqual({ ok: true, setLguEncodedAt: false })
    }
  )

  it("keeps start and end dates on LGU_OWNED_FIELDS and on the override lock list", () => {
    expect(LGU_OVERRIDE_LOCKED_FIELDS).toEqual([
      "status",
      "contractor",
      "bid_price",
      "start_date",
      "target_end_date",
    ])
    expect(LGU_OWNED_FIELDS).toContain("start_date")
    expect(LGU_OWNED_FIELDS).toContain("target_end_date")
    expect(LGU_OWNED_FIELDS).not.toContain("status")
  })

  it("does not treat unchanged echoed fields as writes", () => {
    expect(
      changedProjectFields(
        { contractor: "Build Co", budget_year: 2026 },
        { contractor: "Build Co", budget_year: 2026 }
      )
    ).toEqual([])
  })

  it("should assign funding year and sub account to Province without a second main-account field", () => {
    expect(PROVINCIAL_OWNED_FIELDS).toContain("fund_source")
    expect(PROVINCIAL_OWNED_FIELDS).toContain("funding_year")
    expect(PROVINCIAL_OWNED_FIELDS).toContain("sub_account")
    expect(PROVINCIAL_OWNED_FIELDS).not.toContain("main_account")
    expect(projectFieldFilledByLabel("funding_year")).toBe("filled by Province")
    expect(projectFieldFilledByLabel("sub_account")).toBe("filled by Province")
  })

  it("should assign Period of Implementation to Province and drop schedule/phase/moa text ownership", () => {
    expect(PROVINCIAL_OWNED_FIELDS).toContain("period_of_implementation")
    expect(PROVINCIAL_OWNED_FIELDS).toContain("moa_file")
    expect(PROVINCIAL_OWNED_FIELDS).not.toContain("total_budget")
    expect(PROVINCIAL_OWNED_FIELDS).not.toContain("moa_details")
    expect(LGU_OWNED_FIELDS).toEqual([
      "contractor",
      "bid_price",
      "project_photos",
      "start_date",
      "target_end_date",
    ])
    expect(PROVINCIAL_OWNED_FIELDS).toContain("resolution_file")
    expect(PROVINCIAL_OWNED_FIELDS).toContain("supporting_docs")
    expect(LGU_OWNED_FIELDS).not.toContain("resolution_file")
    expect(LGU_OWNED_FIELDS).not.toContain("supporting_docs")
    expect(LGU_OWNED_FIELDS).not.toContain("moa_file")
    expect(LGU_OWNED_FIELDS).not.toContain("planning_status")
    expect(LGU_PHASE_STATUS).toEqual(["Not Started", "Ongoing", "Completed"])
  })

  it("should label non-owned fields as filled by Province or LGU/Barangay", () => {
    expect(projectFieldFilledByLabel("name")).toBe("filled by Province")
    expect(projectFieldFilledByLabel("bid_price")).toBe("filled by LGU/Barangay")
    expect(projectFieldFilledByLabel("status")).toBe("filled by LGU/Barangay")
    expect(projectFieldFilledByLabel("start_date")).toBe("filled by LGU/Barangay")
    expect(projectFieldFilledByLabel("target_end_date")).toBe(
      "filled by LGU/Barangay"
    )
    expect(projectFieldFilledByLabel("moa_file")).toBe("filled by Province")
    expect(projectFieldFilledByLabel("resolution_file")).toBe("filled by Province")
    expect(projectFieldFilledByLabel("supporting_docs")).toBe("filled by Province")
    expect(projectFieldFilledByLabel("project_photos")).toBe(
      "filled by LGU/Barangay"
    )
  })

  it.each(["Province", "Super Admin"] as const)(
    "should treat all four project file fields as editable for %s",
    (role) => {
      const original = { ...ppdoCreate, status: "Ongoing" }
      for (const field of [
        "moa_file",
        "resolution_file",
        "supporting_docs",
        "project_photos",
      ] as const) {
        expect(isProjectFieldEditable(role, field, original, false)).toBe(true)
      }
      expect(ownedProjectFieldsForActor(role, original, false).has("*")).toBe(
        true
      )
    }
  )

  it.each(["Municipality", "Barangay"] as const)(
    "should treat only project photos as an owned file field for %s",
    (role) => {
      const original = {
        ...ppdoCreate,
        status: "Ongoing",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      }
      const owned = ownedProjectFieldsForActor(role, original, false)
      expect(owned.has("project_photos")).toBe(true)
      expect(isProjectFieldEditable(role, "project_photos", original, false)).toBe(
        true
      )
      for (const field of [
        "moa_file",
        "resolution_file",
        "supporting_docs",
      ] as const) {
        expect(owned.has(field)).toBe(false)
        expect(isProjectFieldEditable(role, field, original, false)).toBe(false)
      }
    }
  )

  it("should let every encoding role write project photos", () => {
    const original = {
      ...ppdoCreate,
      status: "Ongoing",
      lgu_encoded_at: "2026-08-01 00:00:00.000Z",
    }
    for (const role of [
      "Province",
      "Super Admin",
      "Municipality",
      "Barangay",
    ] as const) {
      expect(
        evaluateProjectFieldWrite({
          role,
          isCreate: false,
          original,
          submitted: { project_photos: ["site.jpg"] },
        })
      ).toEqual({
        ok: true,
        setLguEncodedAt: false,
      })
    }
  })

  it("should omit provincial files from an LGU save payload", () => {
    const payload = projectPayloadForActor(
      "Municipality",
      { ...ppdoCreate, lgu_encoded_at: "2026-08-01 00:00:00.000Z" },
      false,
      {
        moa_file: ["old-moa.pdf"],
        resolution_file: ["old-res.pdf"],
        supporting_docs: ["old-sup.pdf"],
        project_photos: ["site.jpg"],
        contractor: "Build Co",
      }
    )
    expect(payload).toEqual({
      project_photos: ["site.jpg"],
      contractor: "Build Co",
    })
  })

  it("lets Province edit number_of_students when the current category is Scholarship", () => {
    expect(
      isProjectFieldEditable(
        "Province",
        "number_of_students",
        { category: "Scholarship" },
        false
      )
    ).toBe(true)
    expect(
      isProjectFieldEditable(
        "Province",
        "number_of_students",
        { category: "Infrastructure" },
        false
      )
    ).toBe(true)
  })

  it("should keep moa_file editable for owning roles when status is For Revision", () => {
    const original = {
      ...ppdoCreate,
      status: "For Revision",
      lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      moa_file: ["old-moa.pdf"],
    }
    for (const role of ["Province", "Super Admin"] as const) {
      expect(isProjectFieldEditable(role, "moa_file", original, false)).toBe(true)
    }
    expect(
      isProjectFieldEditable("Municipality", "moa_file", original, false)
    ).toBe(false)
  })

  it("should allow owning roles to upload or replace moa_file when status is For Revision", () => {
    const original = {
      ...ppdoCreate,
      status: "For Revision",
      lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      moa_file: ["old-moa.pdf"],
    }
    const submitted = { moa_file: ["revised-moa.pdf"] }

    for (const role of ["Province", "Super Admin"] as const) {
      const options = { role, isCreate: false, original, submitted }
      expect(evaluateProjectFieldWrite(options)).toEqual({
        ok: true,
        setLguEncodedAt: false,
      })
      expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual({
        ok: true,
        setLguEncodedAt: false,
      })
    }

    expect(
      evaluateProjectFieldWrite({
        role: "Municipality",
        isCreate: false,
        original,
        submitted,
      })
    ).toEqual({
      ok: false,
      error: "You cannot update field 'moa_file'.",
    })
  })

  it.each(["Super Admin", "Province"] as const)(
    "should allow %s to submit empty or reduced moa_file",
    (role) => {
      const original = {
        ...ppdoCreate,
        moa_file: ["old-moa.pdf", "keep-moa.pdf"],
      }
      const emptyOptions = {
        role,
        isCreate: false,
        original: { ...original, moa_file: ["old-moa.pdf"] },
        submitted: { moa_file: [] },
      }
      const reducedOptions = {
        role,
        isCreate: false,
        original,
        submitted: { moa_file: ["keep-moa.pdf"] },
      }
      expect(evaluateProjectFieldWrite(emptyOptions)).toEqual({
        ok: true,
        setLguEncodedAt: false,
      })
      expect(jsOwnership.evaluateProjectFieldWrite(emptyOptions)).toEqual({
        ok: true,
        setLguEncodedAt: false,
      })
      expect(evaluateProjectFieldWrite(reducedOptions)).toEqual({
        ok: true,
        setLguEncodedAt: false,
      })
      expect(jsOwnership.evaluateProjectFieldWrite(reducedOptions)).toEqual({
        ok: true,
        setLguEncodedAt: false,
      })
    }
  )

  it.each(["Municipality", "Barangay"] as const)(
    "should reject %s writes to moa_file including empty lists",
    (role) => {
      const original = {
        ...ppdoCreate,
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
        moa_file: ["old-moa.pdf"],
      }
      for (const submitted of [
        { moa_file: [] },
        { moa_file: ["-old-moa.pdf"] },
      ]) {
        const options = { role, isCreate: false, original, submitted }
        expect(evaluateProjectFieldWrite(options)).toEqual({
          ok: false,
          error: "You cannot update field 'moa_file'.",
        })
        expect(jsOwnership.evaluateProjectFieldWrite(options)).toEqual({
          ok: false,
          error: "You cannot update field 'moa_file'.",
        })
      }
    }
  )

  it("patches only fields the actor owns", () => {
    const submitted = {
      name: "Charter Bridge",
      contractor: "Build Co",
      progress_pct: 50,
      bid_price: 12_000,
    }

    expect(
      projectPayloadForActor("Municipality", ppdoCreate, false, submitted)
    ).toEqual({
      contractor: "Build Co",
      bid_price: 12_000,
    })
    expect(
      projectPayloadForActor("Province", ppdoCreate, false, submitted)
    ).toEqual({ name: "Charter Bridge", progress_pct: 50 })
  })

  it("locks LGU override fields for Province and Super Admin while leaving other fields editable", () => {
    const original = {
      ...ppdoCreate,
      status: "Ongoing",
      contractor: "Build Co",
    }
    for (const role of ["Province", "Super Admin"] as const) {
      expect(isProjectFieldEditable(role, "status", original, false)).toBe(false)
      expect(isProjectFieldEditable(role, "contractor", original, false)).toBe(
        false
      )
      expect(isProjectFieldEditable(role, "bid_price", original, false)).toBe(
        false
      )
      expect(isProjectFieldEditable(role, "start_date", original, false)).toBe(
        false
      )
      expect(
        isProjectFieldEditable(role, "target_end_date", original, false)
      ).toBe(false)
      expect(isProjectFieldEditable(role, "name", original, false)).toBe(true)
      expect(isProjectFieldEditable(role, "fund_source", original, false)).toBe(
        true
      )
      expect(statusOptionsForActor(role, "Ongoing", original, [
        "Planning",
        "Ongoing",
        "Completed",
      ])).toEqual(["Ongoing"])
    }
    expect(
      isProjectFieldEditable("Municipality", "contractor", original, false)
    ).toBe(true)
    expect(isProjectFieldEditable("Barangay", "bid_price", original, false)).toBe(
      true
    )
    expect(isProjectFieldEditable("Municipality", "start_date", original, false)).toBe(
      true
    )
    expect(
      isProjectFieldEditable("Barangay", "target_end_date", original, false)
    ).toBe(true)
    expect(
      isProjectFieldEditable(
        "Municipality",
        "status",
        { ...original, status: "Ongoing" },
        false
      )
    ).toBe(true)
  })

  it("offers Cancelled to LGU when status is still writable", () => {
    const options = statusOptionsForActor(
      "Municipality",
      "Planning",
      { status: "Planning", lgu_encoded_at: "2026-08-01" },
      ["Planning", "Procurement", "Ongoing", "Cancelled", "For Completion"]
    )
    expect(options).toEqual(["Planning", "Procurement", "Ongoing", "Cancelled"])
  })

  it("does not offer Planning, Procurement, or Ongoing when LGU status is terminal", () => {
    const options = statusOptionsForActor(
      "Municipality",
      "For Completion",
      { status: "For Completion", lgu_encoded_at: "2026-08-01" },
      ["Planning", "Procurement", "Ongoing", "For Completion", "Completed"]
    )
    expect(options).toEqual(["For Completion"])
    expect(
      isProjectFieldEditable("Municipality", "status", {
        status: "For Completion",
        lgu_encoded_at: "2026-08-01",
      }, false)
    ).toBe(false)
  })
})

const AWAITING_DETAILS_COPY =
  "Awaiting your details — please complete the required fields for this project"

const filledLguDetails = {
  status: "Ongoing",
  contractor: "Build Co",
  bid_price: 200_000,
  start_date: "2026-06-01",
  target_end_date: "2026-12-01",
}

describe("awaiting details badge copy", () => {
  it("should return the badge copy when Municipality has any required field empty", () => {
    expect(
      awaitingDetailsBadgeCopy("Municipality", {
        ...filledLguDetails,
        contractor: "",
      })
    ).toBe(AWAITING_DETAILS_COPY)
  })

  it("should return the badge copy when Barangay start or end date is empty", () => {
    expect(
      awaitingDetailsBadgeCopy("Barangay", {
        ...filledLguDetails,
        start_date: "",
        target_end_date: "",
      })
    ).toBe(AWAITING_DETAILS_COPY)
  })

  it("should hide the copy when Municipality has all five fields filled", () => {
    expect(awaitingDetailsBadgeCopy("Municipality", filledLguDetails)).toBe(null)
  })

  it("should hide the copy for Super Admin even when fields are empty", () => {
    expect(
      awaitingDetailsBadgeCopy("Super Admin", { contractor: "" })
    ).toBe(null)
  })

  it("should still show the copy when lgu_encoded_at is set and fields are empty", () => {
    expect(
      awaitingDetailsBadgeCopy("Municipality", {
        ...filledLguDetails,
        contractor: "",
        lgu_encoded_at: "2026-08-01 00:00:00.000Z",
      })
    ).toBe(AWAITING_DETAILS_COPY)
  })

  it("should still show the copy when created_by role is not Municipality", () => {
    expect(
      awaitingDetailsBadgeCopy("Barangay", {
        ...filledLguDetails,
        bid_price: "",
        created_by: "sa1",
      })
    ).toBe(AWAITING_DETAILS_COPY)
  })

  it("should treat empty bid_price zero as empty", () => {
    expect(
      awaitingDetailsBadgeCopy("Municipality", {
        ...filledLguDetails,
        bid_price: 0,
      })
    ).toBe(AWAITING_DETAILS_COPY)
  })
})

describe("JS hook and TS ownership list parity", () => {
  it("keeps owned-field lists identical", () => {
    expect([...jsOwnership.PROVINCIAL_OWNED_FIELDS]).toEqual([...PROVINCIAL_OWNED_FIELDS])
    expect([...jsOwnership.LGU_OWNED_FIELDS]).toEqual([...LGU_OWNED_FIELDS])
    expect([...jsOwnership.LGU_OVERRIDE_LOCKED_FIELDS]).toEqual([
      ...LGU_OVERRIDE_LOCKED_FIELDS,
    ])
  })

  it("matches evaluateProjectFieldWrite on the ownership cases", () => {
    const cases = [
      {
        role: "Province",
        isCreate: true,
        submitted: { ...ppdoCreate, progress_pct: 0 },
      },
      {
        role: "Province",
        isCreate: true,
        original: {},
        submitted: ppdoCreateZeroFilled,
      },
      {
        role: "Province",
        isCreate: true,
        submitted: { ...ppdoCreate, contractor: "Build Co" },
      },
      {
        role: "Province",
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
        submitted: { name: "Renamed", fund_source: "General Fund" },
      },
      {
        role: "Super Admin",
        isCreate: false,
        original: {
          ...ppdoCreate,
          contractor: "Build Co",
          start_date: "2026-06-01",
        },
        submitted: { contractor: "Other Co", start_date: "2026-07-01" },
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

  it("should reject Super Admin changing leftover start_date on update", () => {
    const { event, next } = ownershipHookEvent({
      superuser: true,
      fields: { start_date: "2026-07-01", name: "Existing road" },
      original: { start_date: "2026-06-01", name: "Existing road" },
    })
    expect(() => jsOwnership.applyProjectFieldOwnership(event, false)).toThrow(
      BadRequestError
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should reject Province changing status on update", () => {
    const { event, next } = ownershipHookEvent({
      role: "Province",
      fields: { status: "Planning", name: "Existing road" },
      original: { status: "Ongoing", name: "Existing road" },
    })
    expect(() => jsOwnership.applyProjectFieldOwnership(event, false)).toThrow(
      /You cannot update field 'status'/
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should call next when Province approves with status and approval_status", () => {
    const { event, next } = ownershipHookEvent({
      role: "Province",
      fields: {
        status: "Completed",
        approval_status: "approved",
        approved_by: "province-user",
        approved_at: "2026-08-19",
        name: "Existing road",
      },
      original: {
        status: "For Completion",
        approval_status: "pending",
        name: "Existing road",
      },
    })
    jsOwnership.applyProjectFieldOwnership(event, false)
    expect(next).toHaveBeenCalledOnce()
  })

  it("should reject Province pairing approved with a non-Completed status", () => {
    const { event, next } = ownershipHookEvent({
      role: "Province",
      fields: {
        status: "Planning",
        approval_status: "approved",
        name: "Existing road",
      },
      original: {
        status: "For Completion",
        approval_status: "pending",
        name: "Existing road",
      },
    })
    expect(() => jsOwnership.applyProjectFieldOwnership(event, false)).toThrow(
      /You cannot update field 'status'/
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should reject Super Admin pairing pending with a non-revision status", () => {
    const { event, next } = ownershipHookEvent({
      superuser: true,
      fields: {
        status: "Ongoing",
        approval_status: "pending",
        name: "Existing road",
      },
      original: {
        status: "For Completion",
        approval_status: "pending",
        name: "Existing road",
      },
    })
    expect(() => jsOwnership.applyProjectFieldOwnership(event, false)).toThrow(
      /You cannot update field 'status'/
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("should call next when Super Admin echoes leftover dates", () => {
    const { event, next } = ownershipHookEvent({
      superuser: true,
      fields: {
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        name: "Existing road",
      },
      original: {
        start_date: "2026-06-01",
        target_end_date: "2026-12-01",
        name: "Existing road",
      },
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

  it("should throw and skip next when a retired PPDO role writes a project", () => {
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
