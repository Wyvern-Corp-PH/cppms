import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import PocketBase from "pocketbase"

import { resolvePocketBaseUrl } from "../src/client.ts"
import { DEMO_PROJECT_PREFIX, DEV_SEED_FIXTURES } from "../src/seed/dev-fixtures.ts"

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

function sitePhotoFile() {
  const bytes = readFileSync(join(__dirname, "fixtures", "site-photo.png"))
  return new File([bytes], "site-photo.png", { type: "image/png" })
}

async function ensureAppUser() {
  try {
    await pb.collection("users").create({
      email: adminEmail,
      password: adminPassword,
      passwordConfirm: adminPassword,
      name: "CPPMS Dev Admin",
    })
    console.log(`Created app user ${adminEmail}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/unique|already|exists/i.test(message)) {
      console.warn(`App user create skipped: ${message}`)
    }
  }
}

async function listDemoProjects() {
  const rows = await pb.collection("projects").getFullList()
  return rows.filter((row) =>
    String(row.name ?? "").startsWith(DEMO_PROJECT_PREFIX)
  )
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
