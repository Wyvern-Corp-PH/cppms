import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import PocketBase from "pocketbase"

import { resolvePocketBaseUrl } from "../src/client.ts"
import { normalizeLocationSlug } from "../src/domain/project-filters.ts"
import { REQUIRED_COMPLETION_DOCUMENTS } from "../src/schemas/forms.ts"
import {
  CAGAYAN_LOCATIONS,
  DEMO_PROJECT_PREFIX,
  DEV_SEED_FIXTURES,
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

if (!adminEmail || !adminPassword) {
  console.error("Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD.")
  process.exit(1)
}

const pb = new PocketBase(pbUrl)
pb.autoCancellation(false)
const canonicalLocations = new Set<string>(CAGAYAN_LOCATIONS)

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
    if (!/unique|already|exists/i.test(message)) {
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

async function seedLocations() {
  for (const [index, name] of CAGAYAN_LOCATIONS.entries()) {
    const slug = normalizeLocationSlug(name)
    const existing = await pb
      .collection("locations")
      .getFirstListItem(`slug="${slug}"`)
      .catch(() => null)

    const payload = {
      name,
      slug,
      active: true,
      sort_order: index + 1,
    }

    if (existing) {
      await pb.collection("locations").update(existing.id, payload)
    } else {
      await pb.collection("locations").create(payload)
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
    if (canonicalLocations.has(currentLocation)) {
      continue
    }

    await pb.collection("projects").update(demo.id, {
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

async function seedDemoProjects() {
  const today = new Date().toISOString().slice(0, 10)

  for (const fixture of DEV_SEED_FIXTURES) {
    const project = await pb.collection("projects").create(fixture.project)

    await pb.collection("budget_allocations").create({
      project: project.id,
      amount: fixture.allocation.amount,
      year: fixture.project.budget_year,
      description: fixture.allocation.description,
      date: today,
    })

    for (const expense of fixture.expenses) {
      await pb.collection("budget_expenses").create({
        project: project.id,
        amount: expense.amount,
        category: expense.category,
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
      formData.append("site_photo", sitePhotoFile())
      if (fixture.progress.to_pct >= 100) {
        appendCompletionDocuments(formData)
      }
      try {
        await pb.collection("progress_updates").create(formData)
      } catch (error) {
        const data =
          error && typeof error === "object" && "data" in error
            ? JSON.stringify((error as { data?: unknown }).data)
            : String(error)
        console.warn(`  ! progress update skipped for ${fixture.project.name}: ${data}`)
      }
    }

    console.log(`  + ${fixture.project.name}`)
  }
}

async function main() {
  console.log(`Seeding ${pbUrl} …`)
  await pb.collection("_superusers").authWithPassword(adminEmail, adminPassword)
  await ensureAppUser()
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

  await seedDemoProjects()
  console.log(`Done. Seeded ${DEV_SEED_FIXTURES.length} demo projects.`)
  console.log(`Admin login: ${adminEmail}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
