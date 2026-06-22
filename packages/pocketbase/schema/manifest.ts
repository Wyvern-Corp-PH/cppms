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

export const LGU_LEVEL = ["Municipality", "Barangay", "District", "SK"] as const

export const EXPENSE_CATEGORY = [
  "Materials",
  "Labor",
  "Equipment",
  "Permits & Fees",
  "Other",
] as const

export const APPROVAL_ACTION = ["approve", "reject"] as const
export const ROLE = ["Super Admin", "Admin", "User"] as const
export const ACCOUNT_STATUS = ["Active", "Inactive"] as const
export const AUDIT_ACTION = [
  "create",
  "update",
  "delete",
  "deactivate",
  "approve",
  "reject",
  "reset_password",
] as const

export type CollectionManifest = {
  name: string
  fields: readonly string[]
  relations?: readonly string[]
}

export const COLLECTION_MANIFEST: readonly CollectionManifest[] = [
  {
    name: "users",
    fields: ["name", "role", "account_status"],
  },
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
      "number_of_students",
      "moa_file",
      "resolution_file",
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
      "resolution_file",
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
      "certification_completion",
      "certificate_acceptance",
      "proof_payment_barangay",
      "acknowledgment_completion",
      "audit_documents",
      "verification_documents",
      "liquidation_documents",
      "updated_by",
      "updated_at",
    ],
    relations: ["project", "updated_by"],
  },
  {
    name: "approval_actions",
    fields: ["project", "action", "authority_name", "reason", "created_at"],
    relations: ["project"],
  },
  {
    name: "locations",
    fields: ["name", "slug", "active", "sort_order", "created_by", "updated_by"],
    relations: ["created_by", "updated_by"],
  },
  {
    name: "activity_logs",
    fields: [
      "actor_user",
      "actor_role",
      "action",
      "resource",
      "resource_id",
      "policy_key",
      "target_user",
      "before",
      "after",
      "outcome",
      "error",
      "duration_ms",
      "request_id",
      "env",
      "created_at",
    ],
    relations: ["actor_user", "target_user"],
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
  "activity_logs",
  "locations",
  "approval_actions",
  "progress_updates",
  "budget_expenses",
  "budget_allocations",
  "projects",
] as const
