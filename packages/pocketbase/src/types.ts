export type { RecordModel } from "pocketbase"

export type {
  ActivityLogRecord,
  ApprovalActionRecord,
  BudgetAllocationRecord,
  BudgetExpenseRecord,
  BudgetFundOptionRecord,
  CollectionName,
  LocationRecord,
  ProgressUpdateRecord,
  ProjectRecord,
  UserRecord,
} from "./schemas/records"

export type {
  AccountStatus,
  ApprovalStatus,
  ApprovalAction,
  AuditAction,
  Role,
} from "./schemas/enums"

export type BaseRecord = {
  id: string
  collectionId: string
  created: string
  updated: string
}

export type CollectionRecords = {
  users: import("./schemas/records.js").UserRecord
  projects: import("./schemas/records.js").ProjectRecord
  budget_allocations: import("./schemas/records.js").BudgetAllocationRecord
  budget_expenses: import("./schemas/records.js").BudgetExpenseRecord
  budget_fund_sources: import("./schemas/records.js").BudgetFundOptionRecord
  budget_funding_years: import("./schemas/records.js").BudgetFundOptionRecord
  budget_fund_main_accounts: import("./schemas/records.js").BudgetFundOptionRecord
  budget_fund_sub_accounts: import("./schemas/records.js").BudgetFundOptionRecord
  project_status_options: import("./schemas/records.js").BudgetFundOptionRecord
  project_category_options: import("./schemas/records.js").BudgetFundOptionRecord
  user_role_options: import("./schemas/records.js").BudgetFundOptionRecord
  user_account_status_options: import("./schemas/records.js").BudgetFundOptionRecord
  progress_updates: import("./schemas/records.js").ProgressUpdateRecord
  approval_actions: import("./schemas/records.js").ApprovalActionRecord
  locations: import("./schemas/records.js").LocationRecord
  activity_logs: import("./schemas/records.js").ActivityLogRecord
}
