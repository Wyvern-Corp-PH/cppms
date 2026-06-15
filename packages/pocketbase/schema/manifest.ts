/** Canonical CPPMS PocketBase schema — source of truth for migrations (SPEC §I). */

export const PROJECT_STATUS = [
  "Planning",
  "Procurement",
  "Ongoing",
  "Completed",
  "Approved",
  "Rejected",
] as const

export const PROJECT_CATEGORY = [
  "Infrastructure",
  "Education",
  "Health",
  "Agriculture",
  "Social Services",
  "Scholarship",
] as const

export const LGU_LEVEL = [
  "Municipality",
  "Barangay",
  "District",
  "SK",
] as const

export const EXPENSE_CATEGORY = [
  "Materials",
  "Labor",
  "Equipment",
  "Permits & Fees",
  "Other",
] as const

export const APPROVAL_ACTION = ["approve", "reject"] as const

export type CollectionManifest = {
  name: string
  fields: readonly string[]
  relations?: readonly string[]
}

export const COLLECTION_MANIFEST: readonly CollectionManifest[] = [
  {
    name: "projects",
    fields: [
      "name",
      "description",
      "category",
      "status",
      "location",
      "lgu_level",
      "contractor",
      "start_date",
      "target_end_date",
      "budget_year",
      "total_budget",
      "moa_file",
      "agreement_file",
      "supporting_docs",
      "progress_pct",
      "approval_status",
      "approved_at",
      "approved_by",
      "rejection_reason",
    ],
    relations: ["approved_by"],
  },
  {
    name: "budget_allocations",
    fields: [
      "project",
      "amount",
      "year",
      "description",
      "date",
      "allocated_by",
      "moa_file",
      "agreement_file",
      "supporting_docs",
    ],
    relations: ["project", "allocated_by"],
  },
  {
    name: "budget_expenses",
    fields: [
      "project",
      "amount",
      "category",
      "date",
      "receipt_number",
      "description",
    ],
    relations: ["project"],
  },
  {
    name: "progress_updates",
    fields: [
      "project",
      "from_pct",
      "to_pct",
      "notes",
      "site_photo",
      "updated_by",
      "updated_at",
    ],
    relations: ["project", "updated_by"],
  },
  {
    name: "approval_actions",
    fields: [
      "project",
      "action",
      "authority_name",
      "reason",
      "created_at",
    ],
    relations: ["project"],
  },
] as const

export const MIGRATION_FILE = "1740000001_cppms_collections.js"
export const RULES_MIGRATION_FILE = "1740000002_cppms_collection_rules.js"

/** V14: public list/view; authenticated admin write */
export const PUBLIC_READ_RULE = ""
export const ADMIN_WRITE_RULE = '@request.auth.id != ""'

export const COLLECTION_ACCESS_RULES = {
  listRule: PUBLIC_READ_RULE,
  viewRule: PUBLIC_READ_RULE,
  createRule: ADMIN_WRITE_RULE,
  updateRule: ADMIN_WRITE_RULE,
  deleteRule: ADMIN_WRITE_RULE,
} as const

export const COLLECTION_NAMES = COLLECTION_MANIFEST.map((c) => c.name)

/** Delete order: dependents first */
export const COLLECTION_DELETE_ORDER = [
  "approval_actions",
  "progress_updates",
  "budget_expenses",
  "budget_allocations",
  "projects",
] as const
