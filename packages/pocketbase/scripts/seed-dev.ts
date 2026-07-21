import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import PocketBase from "pocketbase"

import { resolvePocketBaseUrl } from "../src/client.ts"
import { normalizeLocationSlug } from "../src/domain/project-filters.ts"
import { REQUIRED_COMPLETION_DOCUMENTS } from "../src/schemas/forms.ts"
import {
  CAGAYAN_LOCATIONS,
  CAGAYAN_LOCATION_TREE,
  DEMO_PROJECT_PREFIX,
  DEV_SEED_FIXTURES,
  DEV_SEED_USERS,
  SAMPLE_ADMIN_EMAIL,
} from "../src/seed/dev-fixtures.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))

const force = process.argv.includes("--force")

function resolveSeedUrl(): string {
  const internal = process.env.POCKETBASE_INTERNAL_URL?.replace(/\/$/, "")
  if (internal) {
    return internal
  }

  return resolvePocketBaseUrl(
    process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_POCKETBASE_URL
  )
}

const pbUrl = resolveSeedUrl()
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD
const defaultSampleUserPassword = "CagayanDemo123!"
const sampleUserPassword =
  process.env.SEED_SAMPLE_USER_PASSWORD ?? defaultSampleUserPassword

if (!adminEmail || !adminPassword) {
  console.error("Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD.")
  process.exit(1)
}

const pb = new PocketBase(pbUrl)
pb.autoCancellation(false)
const canonicalLocations = new Set<string>([
  ...CAGAYAN_LOCATIONS,
  ...CAGAYAN_LOCATION_TREE.flatMap((municipality) =>
    municipality.barangays.map((barangay) =>
      formatBarangayLocationName(municipality.name, barangay)
    )
  ),
])

function sitePhotoFile() {
  const bytes = readFileSync(join(__dirname, "fixtures", "site-photo.png"))
  return new File([bytes], "site-photo.png", { type: "image/png" })
}

function fixtureDocumentFile(name: string) {
  const bytes = readFileSync(join(__dirname, "fixtures", "site-photo.png"))
  return new File([bytes], name, { type: "image/png" })
}

function appendCompletionDocuments(formData: FormData) {
  for (const doc of REQUIRED_COMPLETION_DOCUMENTS) {
    formData.append(doc.field, fixtureDocumentFile(`${doc.field}.png`))
  }
}

function formatBarangayLocationName(municipality: string, barangay: string) {
  return `${municipality} / ${barangay}`
}

async function upsertLocation(payload: {
  name: string
  slug: string
  level: "Municipality" | "Barangay"
  municipality_name: string
  municipality_slug: string
  barangay_name: string
  active: boolean
  sort_order: number
}) {
  const existing = await pb
    .collection("locations")
    .getFirstListItem(`slug="${payload.slug}"`)
    .catch(() => null)

  if (existing) {
    await pb.collection("locations").update(existing.id, payload)
  } else {
    await pb.collection("locations").create(payload)
  }
}

async function ensureAppUser() {
  try {
    await pb.collection("users").create({
      email: adminEmail,
      password: adminPassword,
      passwordConfirm: adminPassword,
      name: "CPPMS Dev Admin",
      role: "Super Admin",
      account_status: "Active",
    })
    console.log(`Created app user ${adminEmail}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const alreadyExists = await pb
      .collection("users")
      .getFirstListItem(`email="${adminEmail}"`)
      .catch(() => null)
    if (!alreadyExists && !/unique|already|exists/i.test(message)) {
      console.warn(`App user create skipped: ${message}`)
    }
  }

  const existing = await pb
    .collection("users")
    .getFirstListItem(`email="${adminEmail}"`)
    .catch(() => null)
  if (existing) {
    await pb.collection("users").update(existing.id, {
      role: "Super Admin",
      account_status: "Active",
      password: adminPassword,
      passwordConfirm: adminPassword,
    })
  }
}

async function upsertSampleUser(user: (typeof DEV_SEED_USERS)[number]) {
  const existing = await pb
    .collection("users")
    .getFirstListItem(`email="${user.email}"`)
    .catch(() => null)

  const payload = {
    email: user.email,
    password: sampleUserPassword,
    passwordConfirm: sampleUserPassword,
    name: user.name,
    role: user.role,
    account_status: user.account_status,
    municipality: user.municipality,
    barangay: user.barangay,
  }

  if (existing) {
    await pb.collection("users").update(existing.id, payload)
    return "updated"
  }

  await pb.collection("users").create(payload)
  return "created"
}

async function seedSampleUsers() {
  const results: string[] = []
  const sampleUsersByEmail = new Map<
    string,
    { id: string; email: string; name?: string; role?: string }
  >()

  for (const user of DEV_SEED_USERS) {
    const result = await upsertSampleUser(user)
    const record = await pb
      .collection("users")
      .getFirstListItem(`email="${user.email}"`)
    sampleUsersByEmail.set(user.email, {
      id: record.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    results.push(`${user.email} (${user.role}, ${result})`)
  }

  console.log(`Sample users: ${results.join(", ")}`)
  console.log(
    process.env.SEED_SAMPLE_USER_PASSWORD
      ? "Sample user password: configured via SEED_SAMPLE_USER_PASSWORD"
      : `Sample user password: ${defaultSampleUserPassword}`
  )

  return sampleUsersByEmail
}

async function seedLocations() {
  let sortOrder = 1

  for (const municipality of CAGAYAN_LOCATION_TREE) {
    const municipalitySlug = normalizeLocationSlug(municipality.name)

    await upsertLocation({
      name: municipality.name,
      slug: municipalitySlug,
      level: "Municipality",
      municipality_name: municipality.name,
      municipality_slug: municipalitySlug,
      barangay_name: "",
      active: true,
      sort_order: sortOrder,
    })
    sortOrder += 1

    for (const barangay of municipality.barangays) {
      const barangaySlug = normalizeLocationSlug(barangay)
      await upsertLocation({
        name: formatBarangayLocationName(municipality.name, barangay),
        slug: `${municipalitySlug}/${barangaySlug}`,
        level: "Barangay",
        municipality_name: municipality.name,
        municipality_slug: municipalitySlug,
        barangay_name: barangay,
        active: true,
        sort_order: sortOrder,
      })
      sortOrder += 1
    }
  }
}

async function listDemoProjects() {
  const rows = await pb.collection("projects").getFullList()
  return rows.filter((row) =>
    String(row.name ?? "").startsWith(DEMO_PROJECT_PREFIX)
  )
}

async function repairDemoProjectLocations() {
  const demos = await listDemoProjects()
  const fixturesByName = new Map(
    DEV_SEED_FIXTURES.map((fixture) => [fixture.project.name, fixture.project])
  )
  let repaired = 0

  for (const demo of demos) {
    const fixture = fixturesByName.get(String(demo.name ?? ""))
    if (!fixture) {
      continue
    }

    const currentLocation = String(demo.location ?? "")
    const currentMunicipality = String(demo.municipality ?? "")
    const currentBarangay = String(demo.barangay ?? "")
    if (
      canonicalLocations.has(currentLocation) &&
      currentMunicipality === fixture.municipality &&
      currentBarangay === (fixture.barangay ?? "")
    ) {
      continue
    }

    await pb.collection("projects").update(demo.id, {
      municipality: fixture.municipality,
      barangay: fixture.barangay ?? "",
      location: fixture.location,
      lgu_level: fixture.lgu_level,
    })
    repaired += 1
  }

  if (repaired > 0) {
    console.log(`Repaired ${repaired} demo project location(s).`)
  }
}

async function clearDemoProjects() {
  const demos = await listDemoProjects()
  for (const project of demos) {
    await pb.collection("projects").delete(project.id)
  }
  return demos.length
}

async function seedDemoProjects(
  sampleUsersByEmail: Map<
    string,
    { id: string; email: string; name?: string; role?: string }
  >
) {
  const today = new Date().toISOString().slice(0, 10)
  const sampleAdmin = sampleUsersByEmail.get(SAMPLE_ADMIN_EMAIL)

  for (const fixture of DEV_SEED_FIXTURES) {
    const project = await pb.collection("projects").create(fixture.project)

    await pb.collection("budget_allocations").create({
      project: project.id,
      amount: fixture.allocation.amount,
      year: fixture.project.budget_year,
      description: fixture.allocation.description,
      date: today,
      allocated_by: sampleAdmin?.id,
    })

    for (const expense of fixture.expenses) {
      await pb.collection("budget_expenses").create({
        project: project.id,
        amount: expense.amount,
        year: expense.year,
        main_account: expense.main_account,
        sub_account: expense.sub_account,
        description: expense.description,
        date: today,
      })
    }

    if (fixture.progress) {
      const formData = new FormData()
      formData.append("project", project.id)
      formData.append("from_pct", String(fixture.progress.from_pct))
      formData.append("to_pct", String(fixture.progress.to_pct))
      formData.append("notes", fixture.progress.notes)
      if (sampleAdmin?.id) {
        formData.append("updated_by", sampleAdmin.id)
      }
      formData.append("site_photo", sitePhotoFile())
      if (fixture.progress.to_pct >= 100) {
        appendCompletionDocuments(formData)
      }
      // progress_updates.createRule includes SA|Province|Mun|Barangay (1740000030); Province sample
      // admin cannot create. Seed as _superusers so demo rows still land.
      try {
        await pb
          .collection("_superusers")
          .authWithPassword(adminEmail, adminPassword)
        await pb.collection("progress_updates").create(formData)
      } catch (error) {
        const data =
          error && typeof error === "object" && "data" in error
            ? JSON.stringify((error as { data?: unknown }).data)
            : String(error)
        console.warn(`  ! progress update skipped for ${fixture.project.name}: ${data}`)
      } finally {
        await pb
          .collection("users")
          .authWithPassword(SAMPLE_ADMIN_EMAIL, sampleUserPassword)
      }
    }

    if (fixture.project.approval_status === "approved") {
      await pb.collection("approval_actions").create({
        project: project.id,
        action: "approve",
        authority_name: sampleAdmin?.name ?? "Sample Admin",
        reason: "Seeded approval simulation.",
        created_at: today,
      })
    }

    console.log(`  + ${fixture.project.name}`)
  }
}

async function main() {
  console.log(`Seeding ${pbUrl} …`)
  await pb.collection("_superusers").authWithPassword(adminEmail, adminPassword)
  await ensureAppUser()
  const sampleUsersByEmail = await seedSampleUsers()
  await seedLocations()
  await repairDemoProjectLocations()

  const existing = await listDemoProjects()
  if (existing.length > 0 && !force) {
    console.log(
      `Found ${existing.length} demo project(s). Run with --force to replace.`
    )
    return
  }

  if (force && existing.length > 0) {
    const removed = await clearDemoProjects()
    console.log(`Removed ${removed} existing demo project(s).`)
  }

  await pb.collection("users").authWithPassword(SAMPLE_ADMIN_EMAIL, sampleUserPassword)
  await seedDemoProjects(sampleUsersByEmail)
  console.log(`Done. Seeded ${DEV_SEED_FIXTURES.length} demo projects.`)
  console.log(`Admin login: ${adminEmail}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
