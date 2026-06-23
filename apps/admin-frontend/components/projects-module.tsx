"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { canAccess } from "@workspace/pocketbase/domain/access-control"
import { PROJECT_CATEGORY, PROJECT_STATUS } from "@workspace/pocketbase/schema"
import {
  filterProjects,
  formatProjectDateRange,
} from "@workspace/pocketbase/domain/project-filters"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  fieldErrorsFromZod,
  locationRecordSchema,
  parseRecordList,
  projectMutateSchema,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type { LocationRecord, ProjectRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Progress } from "@workspace/ui/components/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

import { PageHeaderBand } from "@/components/page-header-band"
import { DocumentUploadField } from "@/components/document-upload-field"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

type ProjectFormState = {
  name: string
  description: string
  category: ProjectRecord["category"]
  status: ProjectRecord["status"]
  municipality: string
  barangay: string
  contractor: string
  start_date: string
  target_end_date: string
  budget_year: string
  total_budget: string
  number_of_students: string
}

const emptyForm = (): ProjectFormState => ({
  name: "",
  description: "",
  category: "Infrastructure",
  status: "Planning",
  municipality: "",
  barangay: "",
  contractor: "",
  start_date: "",
  target_end_date: "",
  budget_year: String(new Date().getFullYear()),
  total_budget: "",
  number_of_students: "",
})

function namesOnRecord(...values: (string | undefined)[]): string[] {
  return values.filter((value): value is string => Boolean(value?.trim()))
}

function composeProjectLocation(form: Pick<ProjectFormState, "municipality" | "barangay">) {
  if (!form.municipality) {
    return ""
  }
  return form.barangay ? `${form.municipality} / ${form.barangay}` : form.municipality
}

function splitProjectLocation(location: string | undefined) {
  const [municipality = "", ...barangayParts] = (location ?? "").split(" / ")
  return {
    municipality,
    barangay: barangayParts.join(" / "),
  }
}

function uniqueByName<T extends { name: string }>(locations: T[]) {
  const seen = new Set<string>()
  return locations.filter((location) => {
    if (seen.has(location.name)) {
      return false
    }
    seen.add(location.name)
    return true
  })
}

function LocationCombobox({
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  value,
  choices,
  open,
  onOpenChange,
  onSelect,
  disabled = false,
}: {
  label: string
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  value: string
  choices: Array<{ id: string; name: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <span
            className={value ? "truncate" : "truncate text-muted-foreground"}
          >
            {value || placeholder}
          </span>
          <span aria-hidden="true" className="text-muted-foreground">
            ▾
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                data-checked={!value}
                onSelect={() => {
                  onSelect("")
                  onOpenChange(false)
                }}
              >
                —
              </CommandItem>
              {choices.map((choice) => (
                <CommandItem
                  key={choice.id}
                  value={choice.name}
                  data-checked={value === choice.name}
                  onSelect={() => {
                    onSelect(choice.name)
                    onOpenChange(false)
                  }}
                >
                  {choice.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onStatusOpen,
  canUpdate,
  canDelete,
}: {
  project: ProjectRecord
  onEdit: () => void
  onDelete: () => void
  onStatusOpen: () => void
  canUpdate: boolean
  canDelete: boolean
}) {
  const hasActions = canUpdate || canDelete

  return (
    <article
      className="rounded-lg border border-border bg-card p-4"
      data-testid={`project-card-${project.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{project.name}</h2>
            <Badge variant="secondary">{project.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {[project.location, project.category]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {project.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {formatProjectDateRange(
              project.start_date,
              project.target_end_date
            )}{" "}
            · FY {project.budget_year} · {formatPhp(project.total_budget ?? 0)}
          </p>
          {project.category === "Scholarship" && project.number_of_students ? (
            <p className="text-xs text-muted-foreground">
              Students covered: {project.number_of_students}
            </p>
          ) : null}
          <div className="space-y-1">
            <Progress
              value={project.progress_pct ?? 0}
              aria-label={`${project.name} progress`}
            />
            <span className="text-xs text-muted-foreground">
              {project.progress_pct ?? 0}%
            </span>
          </div>
        </div>
        {hasActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Actions for ${project.name}`}
              >
                ⋮
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <>
                  <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={onStatusOpen}>
                    Change status
                  </DropdownMenuItem>
                </>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={onDelete}
                >
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </article>
  )
}

export function ProjectsModule() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")
  const [locationSlug, setLocationSlug] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [municipalityPickerOpen, setMunicipalityPickerOpen] = useState(false)
  const [barangayPickerOpen, setBarangayPickerOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectRecord | null>(null)
  const [form, setForm] = useState<ProjectFormState>(emptyForm())
  const [moaFile, setMoaFile] = useState<File | null>(null)
  const [resolutionFile, setResolutionFile] = useState<File | null>(null)
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [statusTarget, setStatusTarget] = useState<ProjectRecord | null>(null)
  const actor = getPocketBase().authStore?.record
  const canCreateProjects = actor ? canAccess(actor, "projects.create") : true
  const canUpdateProjects = actor ? canAccess(actor, "projects.update") : true
  const canDeleteProjects = actor ? canAccess(actor, "projects.delete") : true

  function clearUploadFiles() {
    setMoaFile(null)
    setResolutionFile(null)
    setSupportingFiles([])
  }

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const pb = getPocketBase()
    const rows = await pb.collection("projects").getFullList()
    setProjects(parseRecordList(projectRecordSchema, rows))
    try {
      const locationRows = await pb.collection("locations").getFullList()
      setLocations(
        parseRecordList(locationRecordSchema, locationRows)
          .filter((location) => location.active)
          .sort(
            (a, b) =>
              (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
              a.name.localeCompare(b.name)
          )
      )
    } catch {
      setLocations([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const { live } = usePocketBaseRealtime(["projects"], () => {
    void loadProjects()
  })

  const filtered = useMemo(
    () =>
      filterProjects(projects, {
        query,
        category:
          category === "all"
            ? undefined
            : (category as ProjectRecord["category"]),
        status:
          status === "all" ? undefined : (status as ProjectRecord["status"]),
        locationSlug: locationSlug === "all" ? undefined : locationSlug,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [projects, query, category, status, locationSlug, dateFrom, dateTo]
  )

  function openCreate() {
    if (!canCreateProjects) {
      return
    }
    setEditing(null)
    setForm(emptyForm())
    setMoaFile(null)
    setResolutionFile(null)
    setSupportingFiles([])
    setFieldErrors({})
    setDialogOpen(true)
  }

  function openEdit(project: ProjectRecord) {
    if (!canUpdateProjects) {
      return
    }
    const locationParts = splitProjectLocation(project.location)
    setEditing(project)
    setForm({
      name: project.name,
      description: project.description ?? "",
      category: project.category,
      status: project.status,
      municipality: locationParts.municipality,
      barangay: locationParts.barangay,
      contractor: project.contractor ?? "",
      start_date: project.start_date ?? "",
      target_end_date: project.target_end_date ?? "",
      budget_year: String(project.budget_year),
      total_budget: project.total_budget ? String(project.total_budget) : "",
      number_of_students: project.number_of_students
        ? String(project.number_of_students)
        : "",
    })
    setMoaFile(null)
    setResolutionFile(null)
    setSupportingFiles([])
    setFieldErrors({})
    setDialogOpen(true)
  }

  async function handleSave() {
    const parsed = projectMutateSchema.safeParse({
      name: form.name,
      description: form.description,
      category: form.category,
      status: form.status,
      location: composeProjectLocation(form),
      contractor: form.contractor,
      start_date: form.start_date || undefined,
      target_end_date: form.target_end_date || undefined,
      budget_year: form.budget_year,
      total_budget: form.total_budget || undefined,
      number_of_students:
        form.category === "Scholarship"
          ? form.number_of_students || undefined
          : undefined,
      progress_pct: editing?.progress_pct ?? 0,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    if (editing ? !canUpdateProjects : !canCreateProjects) {
      return
    }

    setFieldErrors({})
    const pb = getPocketBase()
    const hasFiles = moaFile || resolutionFile || supportingFiles.length > 0

    if (hasFiles) {
      const formData = new FormData()
      for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value))
        }
      }
      if (moaFile) formData.append("moa_file", moaFile)
      if (resolutionFile) formData.append("resolution_file", resolutionFile)
      for (const file of supportingFiles) {
        formData.append("supporting_docs", file)
      }

      if (editing) {
        await pb.collection("projects").update(editing.id, formData)
      } else {
        await pb.collection("projects").create(formData)
      }
    } else if (editing) {
      await pb.collection("projects").update(editing.id, parsed.data)
    } else {
      await pb.collection("projects").create(parsed.data)
    }

    setDialogOpen(false)
    await loadProjects()
  }

  async function handleStatusChange(
    project: ProjectRecord,
    nextStatus: ProjectRecord["status"]
  ) {
    if (!canUpdateProjects) {
      return
    }
    const pb = getPocketBase()
    await pb.collection("projects").update(project.id, { status: nextStatus })
    await loadProjects()
  }

  async function handleDelete(project: ProjectRecord) {
    if (!canDeleteProjects) {
      return
    }
    const pb = getPocketBase()
    await pb.collection("projects").delete(project.id)
    await loadProjects()
  }

  const municipalityChoices = useMemo(() => {
    const municipalities = locations
      .filter((location) => location.level !== "Barangay")
      .map((location) => ({
        id: location.id,
        name: location.municipality_name || location.name,
      }))

    if (
      form.municipality &&
      !municipalities.some((choice) => choice.name === form.municipality)
    ) {
      municipalities.push({
        id: `current-municipality-${form.municipality}`,
        name: form.municipality,
      })
    }

    return uniqueByName(municipalities)
  }, [form.municipality, locations])

  const barangayChoices = useMemo(() => {
    if (!form.municipality) {
      return []
    }

    const barangays = locations
      .filter(
        (location) =>
          location.level === "Barangay" &&
          location.municipality_name === form.municipality
      )
      .map((location) => ({
        id: location.id,
        name: location.barangay_name || splitProjectLocation(location.name).barangay,
      }))
      .filter((location) => location.name)

    if (
      form.barangay &&
      !barangays.some((choice) => choice.name === form.barangay)
    ) {
      barangays.push({
        id: `current-barangay-${form.barangay}`,
        name: form.barangay,
      })
    }

    return uniqueByName(barangays)
  }, [form.barangay, form.municipality, locations])

  const ongoing = projects.filter(
    (project) => project.status === "Ongoing"
  ).length
  const planning = projects.filter(
    (project) => project.status === "Planning"
  ).length

  if (loading) {
    return (
      <div className="space-y-3" data-testid="projects-skeleton">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeaderBand
        title="Project tracking"
        context="CRUD for provincial project records."
        live={live}
        kpis={[
          { label: "Total", value: String(projects.length) },
          { label: "Ongoing", value: String(ongoing) },
          { label: "Planning", value: String(planning) },
        ]}
      />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Input
            aria-label="Search projects"
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PROJECT_STATUS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {PROJECT_CATEGORY.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={locationSlug} onValueChange={setLocationSlug}>
            <SelectTrigger aria-label="Filter by location">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.slug}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <Label htmlFor="filter-date-from">From:</Label>
            <Input
              id="filter-date-from"
              aria-label="Filter from date"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-date-to">To:</Label>
            <Input
              id="filter-date-to"
              aria-label="Filter to date"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        </div>
        {canCreateProjects ? (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={openCreate}
              data-testid="create-project"
            >
              New project
            </Button>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <h2 className="font-semibold">No projects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canCreateProjects
              ? "Create a project to start tracking provincial work."
              : "No project records are available for the current filters."}
          </p>
          {canCreateProjects ? (
            <Button className="mt-4" type="button" onClick={openCreate}>
              Create project
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => openEdit(project)}
              onDelete={() => void handleDelete(project)}
              onStatusOpen={() => setStatusTarget(project)}
              canUpdate={canUpdateProjects}
              canDelete={canDeleteProjects}
            />
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            clearUploadFiles()
            setMunicipalityPickerOpen(false)
            setBarangayPickerOpen(false)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit project" : "New project"}
            </DialogTitle>
            <DialogDescription>
              Enter the project details, funding, dates, and supporting
              documents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={form.name}
                aria-invalid={Boolean(fieldErrors.name)}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              {fieldErrors.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => {
                    const nextCategory = value as ProjectRecord["category"]
                    setForm({
                      ...form,
                      category: nextCategory,
                      number_of_students:
                        nextCategory === "Scholarship"
                          ? form.number_of_students
                          : "",
                    })
                  }}
                >
                  <SelectTrigger aria-label="Category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_CATEGORY.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      status: value as ProjectRecord["status"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.category === "Scholarship" ? (
              <div className="space-y-1">
                <Label htmlFor="project-number-of-students">
                  Number of Students
                </Label>
                <Input
                  id="project-number-of-students"
                  type="number"
                  min={1}
                  value={form.number_of_students}
                  aria-invalid={Boolean(fieldErrors.number_of_students)}
                  onChange={(event) =>
                    setForm({ ...form, number_of_students: event.target.value })
                  }
                />
                {fieldErrors.number_of_students ? (
                  <p className="text-sm text-destructive" role="alert">
                    {fieldErrors.number_of_students}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Municipality</Label>
                <LocationCombobox
                  label="Municipality"
                  placeholder="Select municipality"
                  searchPlaceholder="Search municipalities..."
                  emptyMessage="No municipalities found."
                  value={form.municipality}
                  choices={municipalityChoices}
                  open={municipalityPickerOpen}
                  onOpenChange={setMunicipalityPickerOpen}
                  onSelect={(value) =>
                    setForm({
                      ...form,
                      municipality: value,
                      barangay:
                        value === form.municipality ? form.barangay : "",
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Barangay</Label>
                <LocationCombobox
                  label="Barangay"
                  placeholder="Select barangay"
                  searchPlaceholder="Search barangays..."
                  emptyMessage={
                    form.municipality
                      ? "No barangays found."
                      : "Select municipality first."
                  }
                  value={form.barangay}
                  choices={barangayChoices}
                  open={barangayPickerOpen}
                  onOpenChange={setBarangayPickerOpen}
                  onSelect={(value) =>
                    setForm({
                      ...form,
                      barangay: value,
                    })
                  }
                  disabled={!form.municipality}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="project-contractor">Contractor</Label>
              <Input
                id="project-contractor"
                value={form.contractor}
                onChange={(event) =>
                  setForm({ ...form, contractor: event.target.value })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="project-start">Start date</Label>
                <Input
                  id="project-start"
                  type="date"
                  value={form.start_date}
                  onChange={(event) =>
                    setForm({ ...form, start_date: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="project-end">Target end date</Label>
                <Input
                  id="project-end"
                  type="date"
                  value={form.target_end_date}
                  onChange={(event) =>
                    setForm({ ...form, target_end_date: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="project-year">Budget year</Label>
                <Input
                  id="project-year"
                  type="number"
                  value={form.budget_year}
                  aria-invalid={Boolean(fieldErrors.budget_year)}
                  onChange={(event) =>
                    setForm({ ...form, budget_year: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="project-budget">Total budget (PHP)</Label>
                <Input
                  id="project-budget"
                  type="number"
                  value={form.total_budget}
                  onChange={(event) =>
                    setForm({ ...form, total_budget: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">Required documents</p>
              <DocumentUploadField
                id="moa-file"
                label="Memorandum of Agreement"
                files={moaFile ? [moaFile] : []}
                existingNames={namesOnRecord(editing?.moa_file)}
                onChange={(files) => setMoaFile(files[0] ?? null)}
              />
              <DocumentUploadField
                id="resolution-file"
                label="Resolution"
                files={resolutionFile ? [resolutionFile] : []}
                existingNames={namesOnRecord(editing?.resolution_file)}
                onChange={(files) => setResolutionFile(files[0] ?? null)}
              />
              <DocumentUploadField
                id="supporting-file"
                label="Supporting project documents"
                multiple
                files={supportingFiles}
                existingNames={editing?.supporting_docs ?? []}
                onChange={setSupportingFiles}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Select the next status for this project.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1">
            {PROJECT_STATUS.map((value) => (
              <li key={value}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    if (statusTarget)
                      void handleStatusChange(statusTarget, value)
                    setStatusTarget(null)
                  }}
                >
                  {value}
                </button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusTarget(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
