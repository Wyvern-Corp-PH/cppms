export type { RecordModel } from "pocketbase"

export type {
  ApprovalActionRecord,
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  CollectionName,
  ProgressUpdateRecord,
  ProjectRecord,
} from "./schemas/records"

export type { ApprovalStatus, ApprovalAction } from "./schemas/enums"

export type BaseRecord = {
  id: string
  collectionId: string
  created: string
  updated: string
}

export type CollectionRecords = {
  projects: import("./schemas/records.js").ProjectRecord
  budget_allocations: import("./schemas/records.js").BudgetAllocationRecord
  budget_expenses: import("./schemas/records.js").BudgetExpenseRecord
  progress_updates: import("./schemas/records.js").ProgressUpdateRecord
  approval_actions: import("./schemas/records.js").ApprovalActionRecord
}
