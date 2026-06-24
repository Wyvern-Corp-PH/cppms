import type { ProjectRecord } from "../types"
export {
  CAGAYAN_LOCATIONS,
  CAGAYAN_LOCATION_TREE,
} from "./cagayan-locations"

export const DEMO_PROJECT_PREFIX = "Demo:"
export const SAMPLE_ADMIN_EMAIL = "sample.admin@cppms.test"
export const SAMPLE_USER_EMAIL = "sample.user@cppms.test"
export const SAMPLE_INACTIVE_USER_EMAIL = "sample.inactive@cppms.test"

export type DevSeedUser = {
  email: string
  name: string
  role: "Super Admin" | "Province" | "Municipality" | "Barangay"
  account_status: "Active" | "Inactive"
  municipality?: string
  barangay?: string
}

export const DEV_SEED_USERS: DevSeedUser[] = [
  {
    email: SAMPLE_ADMIN_EMAIL,
    name: "Sample Province Reviewer",
    role: "Province",
    account_status: "Active",
  },
  {
    email: SAMPLE_USER_EMAIL,
    name: "Sample Barangay Encoder",
    role: "Barangay",
    account_status: "Active",
    municipality: "Tuguegarao City",
    barangay: "Centro 01 (Bagumbayan)",
  },
  {
    email: SAMPLE_INACTIVE_USER_EMAIL,
    name: "Sample Inactive User",
    role: "Municipality",
    account_status: "Inactive",
    municipality: "Lasam",
  },
]

export type DevSeedProject = {
  project: {
    name: string
    description: string
    category: ProjectRecord["category"]
    status: ProjectRecord["status"]
    municipality: string
    barangay?: string
    location: string
    lgu_level: ProjectRecord["lgu_level"]
    contractor: string
    start_date: string
    target_end_date: string
    budget_year: number
    total_budget: number
    number_of_students?: number
    progress_pct: number
    approval_status?: ProjectRecord["approval_status"]
  }
  allocation: { amount: number; description: string }
  expenses: Array<{
    amount: number
    fund_source: string
    funding_years: string
    fund_type: "Local" | "National" | "Grant" | "Other"
    fund_type_other?: string
    description: string
  }>
  progress?: { from_pct: number; to_pct: number; notes: string }
}

export const DEV_SEED_FIXTURES: DevSeedProject[] = [
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} Tuguegarao Bridge Rehabilitation`,
      description:
        "Structural repairs and deck resurfacing on the primary provincial crossing.",
      category: "Infrastructure",
      status: "Ongoing",
      municipality: "Tuguegarao City",
      location: "Tuguegarao City",
      lgu_level: "Municipality",
      contractor: "Cagayan Builders Consortium",
      start_date: "2026-01-15",
      target_end_date: "2026-12-31",
      budget_year: 2026,
      total_budget: 15_000_000,
      progress_pct: 62,
    },
    allocation: { amount: 12_000_000, description: "FY2026 capital outlay" },
    expenses: [
      {
        amount: 4_200_000,
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        description: "Rebar and concrete",
      },
      {
        amount: 1_800_000,
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        description: "Crew wages Q1",
      },
    ],
    progress: { from_pct: 45, to_pct: 62, notes: "Deck segment B poured." },
  },
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} Provincial Hospital Wing Expansion`,
      description:
        "New outpatient wing and equipment bay for Cagayan Provincial Hospital.",
      category: "Health",
      status: "Procurement",
      municipality: "Tuguegarao City",
      location: "Tuguegarao City",
      lgu_level: "Municipality",
      contractor: "North Luzon Medical Works",
      start_date: "2026-03-01",
      target_end_date: "2027-06-30",
      budget_year: 2026,
      total_budget: 28_500_000,
      progress_pct: 12,
    },
    allocation: {
      amount: 20_000_000,
      description: "Hospital expansion allotment",
    },
    expenses: [
      {
        amount: 950_000,
        fund_source: "National Grant",
        funding_years: "2026",
        fund_type: "National",
        description: "Diagnostic package down payment",
      },
    ],
    progress: { from_pct: 1, to_pct: 12, notes: "Bid documents published." },
  },
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} Rice Seed Distribution Program`,
      description:
        "Certified seed distribution to farmer cooperatives across the province.",
      category: "Agriculture",
      status: "Ongoing",
      municipality: "Solana",
      location: "Solana",
      lgu_level: "District",
      contractor: "DA Provincial Office",
      start_date: "2026-02-01",
      target_end_date: "2026-08-31",
      budget_year: 2026,
      total_budget: 6_750_000,
      progress_pct: 58,
    },
    allocation: { amount: 6_750_000, description: "Agriculture support fund" },
    expenses: [
      {
        amount: 2_100_000,
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        description: "Seed stock procurement",
      },
      {
        amount: 450_000,
        fund_source: "Trust Fund",
        funding_years: "2026",
        fund_type: "Other",
        fund_type_other: "Warehouse handling fund",
        description: "Warehouse handling",
      },
    ],
    progress: {
      from_pct: 40,
      to_pct: 58,
      notes: "Second tranche delivered to Solana.",
    },
  },
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} SK Youth Skills Center`,
      description: "Training facility for barangay SK livelihood programs.",
      category: "Social Services",
      status: "Planning",
      municipality: "Peñablanca",
      location: "Peñablanca",
      lgu_level: "Barangay",
      contractor: "Pending award",
      start_date: "2026-06-01",
      target_end_date: "2027-03-31",
      budget_year: 2026,
      total_budget: 3_200_000,
      progress_pct: 5,
    },
    allocation: { amount: 1_500_000, description: "Planning-phase release" },
    expenses: [
      {
        amount: 120_000,
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        description: "Environmental clearance",
      },
    ],
  },
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} College Scholarship Batch 2026`,
      description:
        "Provincial scholarship grants for STEM and teacher education tracks.",
      category: "Scholarship",
      status: "Ongoing",
      municipality: "Tuguegarao City",
      location: "Tuguegarao City",
      lgu_level: "Municipality",
      contractor: "Provincial Scholarship Board",
      start_date: "2026-01-10",
      target_end_date: "2026-12-15",
      budget_year: 2026,
      total_budget: 9_000_000,
      number_of_students: 180,
      progress_pct: 78,
    },
    allocation: { amount: 9_000_000, description: "Scholarship fund FY2026" },
    expenses: [
      {
        amount: 5_600_000,
        fund_source: "Scholarship Fund",
        funding_years: "2026",
        fund_type: "Other",
        fund_type_other: "Scholarship trust fund",
        description: "First semester disbursements",
      },
    ],
    progress: { from_pct: 60, to_pct: 78, notes: "Second tranche validated." },
  },
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} Drainage Package Phase 2`,
      description:
        "Flood mitigation channels for low-lying barangays near Cagayan River.",
      category: "Infrastructure",
      status: "Ongoing",
      municipality: "Enrile",
      location: "Enrile",
      lgu_level: "Barangay",
      contractor: "Riverworks JV",
      start_date: "2025-11-01",
      target_end_date: "2026-04-30",
      budget_year: 2026,
      total_budget: 11_250_000,
      progress_pct: 18,
    },
    allocation: { amount: 10_000_000, description: "Drainage continuity fund" },
    expenses: [
      {
        amount: 1_350_000,
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        description: "Precast culverts",
      },
    ],
    progress: {
      from_pct: 10,
      to_pct: 18,
      notes: "Segment 3 excavation started.",
    },
  },
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} Rural Health Unit Upgrade`,
      description:
        "Facility upgrade and cold-chain storage for Barangay Centro RHU.",
      category: "Health",
      status: "Completed",
      municipality: "Amulung",
      location: "Amulung",
      lgu_level: "Barangay",
      contractor: "Valley Health Contractors",
      start_date: "2025-08-01",
      target_end_date: "2026-02-28",
      budget_year: 2026,
      total_budget: 4_500_000,
      progress_pct: 100,
    },
    allocation: { amount: 4_500_000, description: "RHU upgrade allotment" },
    expenses: [
      {
        amount: 2_800_000,
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        description: "Clinic fit-out",
      },
      {
        amount: 900_000,
        fund_source: "General Fund",
        funding_years: "2026",
        fund_type: "Local",
        description: "Construction labor",
      },
    ],
    progress: { from_pct: 85, to_pct: 100, notes: "Final inspection passed." },
  },
  {
    project: {
      name: `${DEMO_PROJECT_PREFIX} Municipal Road Package A`,
      description:
        "Concrete paving for farm-to-market roads in western municipalities.",
      category: "Infrastructure",
      status: "Approved",
      municipality: "Piat",
      location: "Piat",
      lgu_level: "Municipality",
      contractor: "Highland Roads Inc.",
      start_date: "2025-05-01",
      target_end_date: "2025-12-31",
      budget_year: 2026,
      total_budget: 18_000_000,
      progress_pct: 100,
      approval_status: "approved",
    },
    allocation: { amount: 18_000_000, description: "Road package allotment" },
    expenses: [
      {
        amount: 16_200_000,
        fund_source: "National Grant",
        funding_years: "2026",
        fund_type: "National",
        description: "Paving works",
      },
      {
        amount: 1_200_000,
        fund_source: "National Grant",
        funding_years: "2026",
        fund_type: "National",
        description: "Quality assurance crew",
      },
    ],
    progress: {
      from_pct: 92,
      to_pct: 100,
      notes: "Provincial approval recorded.",
    },
  },
]
