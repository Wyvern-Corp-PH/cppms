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

migrate(
  (app) => {
    const users = resolveUsersCollection(app)
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

    const projects = new Collection({      type: "base",
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
        { type: "number", name: "budget_year", required: true, min: 2000, max: 2100 },
        { type: "number", name: "total_budget", min: 0 },
        {
          type: "file",
          name: "moa_file",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: documentMimeTypes,
        },
        {
          type: "file",
          name: "agreement_file",
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
          name: "agreement_file",
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
  },
  (app) => {
    for (const name of [
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
