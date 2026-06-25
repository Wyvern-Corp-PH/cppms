const migrate = globalThis.migrate

const MULTI_FILE_FIELDS = {
  projects: ["moa_file", "resolution_file", "supporting_docs"],
  budget_allocations: ["moa_file", "resolution_file", "supporting_docs"],
  progress_updates: [
    "site_photo",
    "certification_completion",
    "certificate_acceptance",
    "proof_payment_barangay",
    "acknowledgment_completion",
    "audit_documents",
    "verification_documents",
    "liquidation_documents",
  ],
}

const PREVIOUS_MAX_SELECT = {
  projects: {
    moa_file: 1,
    resolution_file: 1,
    supporting_docs: 10,
  },
  budget_allocations: {
    moa_file: 1,
    resolution_file: 1,
    supporting_docs: 10,
  },
  progress_updates: {
    site_photo: 10,
    certification_completion: 1,
    certificate_acceptance: 1,
    proof_payment_barangay: 1,
    acknowledgment_completion: 1,
    audit_documents: 10,
    verification_documents: 10,
    liquidation_documents: 10,
  },
}

function setFileMaxSelect(app, valueForField) {
  for (const [collectionName, fieldNames] of Object.entries(MULTI_FILE_FIELDS)) {
    const collection = app.findCollectionByNameOrId(collectionName)
    for (const fieldName of fieldNames) {
      const field = collection.fields.getByName(fieldName)
      field.maxSelect = valueForField(collectionName, fieldName)
    }
    app.save(collection)
  }
}

migrate(
  (app) => {
    setFileMaxSelect(app, () => 10)
  },
  (app) => {
    setFileMaxSelect(
      app,
      (collectionName, fieldName) => PREVIOUS_MAX_SELECT[collectionName][fieldName]
    )
  }
)
