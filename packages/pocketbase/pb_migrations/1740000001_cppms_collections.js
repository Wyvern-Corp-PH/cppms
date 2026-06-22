/// <reference path="../pb_data/types.d.ts" />

function resolveUsersCollection(app) {
  try {
    return app.findCollectionByNameOrId("users")
  } catch {
    const users = new Collection({
      type: "auth",
      name: "users",
      fields: [],
      passwordAuth: { enabled: true },
    })
    app.save(users)
    return app.findCollectionByNameOrId("users")
  }
}

function fieldExists(collection, name) {
  try {
    collection.fields.getByName(name)
    return true
  } catch {
    return false
  }
}

function ensureUserFields(app, users) {
  let changed = false

  if (!fieldExists(users, "name")) {
    users.fields.add(new TextField({ name: "name" }))
    changed = true
  }

  if (!fieldExists(users, "role")) {
    users.fields.add(
      new SelectField({
        name: "role",
        required: true,
        maxSelect: 1,
        values: ["Super Admin", "Admin", "User"],
      })
    )
    changed = true
  }

  if (!fieldExists(users, "account_status")) {
    users.fields.add(
      new SelectField({
        name: "account_status",
        required: true,
        maxSelect: 1,
        values: ["Active", "Inactive"],
      })
    )
    changed = true
  }

  if (changed) {
    app.save(users)
  }
}

migrate(
  (app) => {
    const users = resolveUsersCollection(app)
    ensureUserFields(app, users)
    const usersId = users.id

    const documentMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
    ]

    const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"]

    const projects = new Collection({
      type: "base",
      name: "projects",
      fields: [
        { type: "text", name: "name", required: true },
        { type: "text", name: "description" },
        {
          type: "select",
          name: "category",
          required: true,
          maxSelect: 1,
          values: [
            "Infrastructure",
            "Education",
            "Health",
            "Agriculture",
            "Social Services",
            "Scholarship",
          ],
        },
        {
          type: "select",
          name: "status",
          required: true,
          maxSelect: 1,
          values: [
            "Planning",
            "Procurement",
            "Ongoing",
            "Completed",
            "Approved",
            "Rejected",
          ],
        },
        { type: "text", name: "location" },
        {
          type: "select",
          name: "lgu_level",
          maxSelect: 1,
          values: ["Municipality", "Barangay", "District", "SK"],
        },
        { type: "text", name: "contractor" },
        { type: "date", name: "start_date" },
        { type: "date", name: "target_end_date" },
        {
          type: "number",
          name: "budget_year",
          required: true,
          min: 2000,
          max: 2100,
        },
        { type: "number", name: "total_budget", min: 0 },
        { type: "number", name: "number_of_students", min: 1, onlyInt: true },
        {
          type: "file",
          name: "moa_file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "resolution_file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "supporting_docs",
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        { type: "number", name: "progress_pct", min: 0, max: 100 },
        {
          type: "select",
          name: "approval_status",
          maxSelect: 1,
          values: ["pending", "approved", "rejected"],
        },
        { type: "date", name: "approved_at" },
        {
          type: "relation",
          name: "approved_by",
          collectionId: usersId,
          maxSelect: 1,
        },
        { type: "text", name: "rejection_reason" },
      ],
    })

    app.save(projects)

    const budgetAllocations = new Collection({
      type: "base",
      name: "budget_allocations",
      fields: [
        {
          type: "relation",
          name: "project",
          required: true,
          collectionId: projects.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { type: "number", name: "amount", required: true },
        { type: "number", name: "year", required: true, min: 2000, max: 2100 },
        { type: "text", name: "description" },
        { type: "date", name: "date", required: true },
        {
          type: "relation",
          name: "allocated_by",
          collectionId: usersId,
          maxSelect: 1,
        },
        {
          type: "file",
          name: "moa_file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "resolution_file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "supporting_docs",
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
      ],
    })

    app.save(budgetAllocations)

    const budgetExpenses = new Collection({
      type: "base",
      name: "budget_expenses",
      fields: [
        {
          type: "relation",
          name: "project",
          required: true,
          collectionId: projects.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { type: "number", name: "amount", required: true },
        {
          type: "select",
          name: "category",
          required: true,
          maxSelect: 1,
          values: [
            "Materials",
            "Labor",
            "Equipment",
            "Permits & Fees",
            "Other",
          ],
        },
        { type: "date", name: "date", required: true },
        { type: "text", name: "receipt_number" },
        { type: "text", name: "description" },
      ],
    })

    app.save(budgetExpenses)

    const progressUpdates = new Collection({
      type: "base",
      name: "progress_updates",
      fields: [
        {
          type: "relation",
          name: "project",
          required: true,
          collectionId: projects.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { type: "number", name: "from_pct", required: true, min: 0, max: 100 },
        { type: "number", name: "to_pct", required: true, min: 0, max: 100 },
        { type: "text", name: "notes" },
        {
          type: "file",
          name: "site_photo",
          required: true,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: imageMimeTypes,
        },
        {
          type: "file",
          name: "certification_completion",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "certificate_acceptance",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "proof_payment_barangay",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "acknowledgment_completion",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "audit_documents",
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "verification_documents",
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "liquidation_documents",
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "relation",
          name: "updated_by",
          collectionId: usersId,
          maxSelect: 1,
        },
        {
          type: "autodate",
          name: "updated_at",
          onCreate: true,
          onUpdate: true,
        },
      ],
    })

    app.save(progressUpdates)

    const approvalActions = new Collection({
      type: "base",
      name: "approval_actions",
      fields: [
        {
          type: "relation",
          name: "project",
          required: true,
          collectionId: projects.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          type: "select",
          name: "action",
          required: true,
          maxSelect: 1,
          values: ["approve", "reject"],
        },
        { type: "text", name: "authority_name", required: true },
        { type: "text", name: "reason" },
        {
          type: "autodate",
          name: "created_at",
          onCreate: true,
          onUpdate: false,
        },
      ],
    })

    app.save(approvalActions)

    const locations = new Collection({
      type: "base",
      name: "locations",
      fields: [
        { type: "text", name: "name", required: true },
        { type: "text", name: "slug", required: true },
        { type: "bool", name: "active", required: true },
        { type: "number", name: "sort_order", min: 0, onlyInt: true },
        {
          type: "relation",
          name: "created_by",
          collectionId: usersId,
          maxSelect: 1,
        },
        {
          type: "relation",
          name: "updated_by",
          collectionId: usersId,
          maxSelect: 1,
        },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_locations_slug ON locations (slug)"],
    })

    app.save(locations)

    const activityLogs = new Collection({
      type: "base",
      name: "activity_logs",
      fields: [
        {
          type: "relation",
          name: "actor_user",
          collectionId: usersId,
          maxSelect: 1,
        },
        {
          type: "select",
          name: "actor_role",
          required: true,
          maxSelect: 1,
          values: ["Super Admin", "Admin", "User"],
        },
        {
          type: "select",
          name: "action",
          required: true,
          maxSelect: 1,
          values: [
            "create",
            "update",
            "delete",
            "deactivate",
            "approve",
            "reject",
            "reset_password",
          ],
        },
        { type: "text", name: "resource", required: true },
        { type: "text", name: "resource_id" },
        { type: "text", name: "policy_key" },
        {
          type: "relation",
          name: "target_user",
          collectionId: usersId,
          maxSelect: 1,
        },
        { type: "json", name: "before" },
        { type: "json", name: "after" },
        {
          type: "select",
          name: "outcome",
          required: true,
          maxSelect: 1,
          values: ["success", "error", "denied"],
        },
        { type: "text", name: "error" },
        { type: "number", name: "duration_ms", required: true, min: 0 },
        { type: "text", name: "request_id" },
        { type: "json", name: "env" },
        {
          type: "autodate",
          name: "created_at",
          onCreate: true,
          onUpdate: false,
        },
      ],
    })

    app.save(activityLogs)
  },
  (app) => {
    for (const name of [
      "activity_logs",
      "locations",
      "approval_actions",
      "progress_updates",
      "budget_expenses",
      "budget_allocations",
      "projects",
    ]) {
      try {
        const collection = app.findCollectionByNameOrId(name)
        app.delete(collection)
      } catch {
        // already removed
      }
    }
  }
)
