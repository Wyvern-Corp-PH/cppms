"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import { loadOptionRecordNames, loadSelectFieldOptions } from "@workspace/pocketbase"
import {
  canAccess,
  filterProjectsForUser,
} from "@workspace/pocketbase/domain/access-control"
import {
  isProjectFieldEditable,
  ownedProjectFieldsForActor,
  projectFieldFilledByLabel,
  projectPayloadForActor,
  statusOptionsForActor,
} from "@workspace/pocketbase/domain/project-field-ownership"
import { PROJECT_CATEGORY, PROJECT_STATUS } from "@workspace/pocketbase/schema"
import { effectiveProgressPct } from "@workspace/pocketbase/domain/progress-summary"
import {
  filterProjects,
  projectLocationDisplayParts,
} from "@workspace/pocketbase/domain/project-filters"
import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import {
  fieldErrorsFromZod,
  locationRecordSchema,
  parseRecordList,
  progressUpdateRecordSchema,
  projectMutateSchemaForActor,
  projectRecordSchema,
} from "@workspace/pocketbase/schemas"
import type {
  LocationRecord,
  ProgressUpdateRecord,
  ProjectRecord,
} from "@workspace/pocketbase/types"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
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
import { DateRangeFilter } from "@/components/date-range-filter"
import { DocumentUploadField, IMAGE_UPLOAD_ACCEPT } from "@/components/document-upload-field"
import { FundSourceFields } from "@/components/released-amount-fields"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

type ProjectFormState = {
  name: string
  description: string
  category: ProjectRecord["category"]
  status: ProjectRecord["status"]
  municipality: string
  barangay: string
  location: string
  contractor: string
  budget_year: string
  number_of_students: string
  funding_year: string
  fund_source: string
  sub_account: string
  period_of_implementation: string
  bid_price: string
}

type ProjectImportResult = {
  imported: number
  total: number
  errors: string[]
}

const PROJECT_IMPORT_HEADERS = [
  "Project Name",
  "Description",
  "Location",
] as const

function importCellText(row: Record<string, unknown>, header: string) {
  const value = row[header]
  return value === undefined || value === null ? "" : String(value).trim()
}

function parseImportBudget(value: string) {
  const normalized = value.replace(/[₱,\s]/g, "")
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

function formatImportSummary(result: ProjectImportResult) {
  const errorLabel = result.errors.length === 1 ? "row had errors" : "rows had errors"
  return `${result.imported} of ${result.total} projects imported successfully. ${result.errors.length} ${errorLabel}.`
}

function importRowError(file: File, rowNumber: number, message: string) {
  return `${file.name} Row ${rowNumber}: ${message}`
}

const emptyForm = (): ProjectFormState => ({
  name: "",
  description: "",
  category: "Infrastructure",
  status: "Planning",
  municipality: "",
  barangay: "",
  location: "",
  contractor: "",
  budget_year: String(new Date().getFullYear()),
  number_of_students: "",
  funding_year: "",
  fund_source: "",
  sub_account: "",
  period_of_implementation: "",
  bid_price: "",
})

function namesOnRecord(...values: (string | string[] | undefined)[]): string[] {
  return values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter((name) => Boolean(name.trim()))
    }
    return value?.trim() ? [value] : []
  })
}

function sameNameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((name, index) => name === right[index])
}

function appendRetainedAndNewFiles(
  formData: FormData,
  field: string,
  retainedNames: string[],
  files: File[],
  originalNames: string[]
) {
  for (const name of retainedNames) {
    formData.append(field, name)
  }
  for (const file of files) {
    formData.append(field, file)
  }
  if (retainedNames.length > 0 || files.length > 0) return
  for (const name of originalNames) {
    formData.append(field, `-${name}`)
  }
}

type ProjectFileFieldInput = {
  allowed: boolean
  key: string
  files: File[]
  retainedNames: string[]
  originalNames: string[]
}

function projectFileFieldsDirty(fields: ProjectFileFieldInput[]) {
  return fields.some(
    (field) =>
      field.files.length > 0 ||
      (field.allowed && !sameNameList(field.retainedNames, field.originalNames))
  )
}

function appendProjectFileFields(
  formData: FormData,
  fields: ProjectFileFieldInput[]
) {
  for (const field of fields) {
    if (!field.allowed) continue
    appendRetainedAndNewFiles(
      formData,
      field.key,
      field.retainedNames,
      field.files,
      field.originalNames
    )
  }
}

function splitProjectLocation(location: string | undefined) {
  const [municipality = "", ...barangayParts] = (location ?? "").split(" / ")
  return {
    municipality,
    barangay: barangayParts.join(" / "),
  }
}

function getLocationHierarchy(location: LocationRecord) {
  const split = splitProjectLocation(location.name)
  const isBarangay =
    location.level === "Barangay" ||
    Boolean(location.barangay_name) ||
    location.slug.includes("/") ||
    Boolean(split.barangay)

  return {
    isBarangay,
    municipality: location.municipality_name || split.municipality,
    barangay: location.barangay_name || split.barangay,
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
          <CommandList className="max-h-[min(16rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
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
  progressPct,
  onEdit,
  onDelete,
  onStatusOpen,
  canUpdate,
  canDelete,
  canChangeStatus,
}: {
  project: ProjectRecord
  progressPct: number
  onEdit: () => void
  onDelete: () => void
  onStatusOpen: () => void
  canUpdate: boolean
  canDelete: boolean
  canChangeStatus: boolean
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
            {[...projectLocationDisplayParts(project), project.category]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {project.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {project.period_of_implementation || "—"} · FY {project.budget_year}{" "}
            · {formatPhp(project.bid_price ?? 0)}
          </p>
          {project.category === "Scholarship" && project.number_of_students ? (
            <p className="text-xs text-muted-foreground">
              Students covered: {project.number_of_students}
            </p>
          ) : null}
          <div className="space-y-1">
            <Progress
              value={progressPct}
              aria-label={`${project.name} progress`}
            />
            <span className="text-xs text-muted-foreground">{progressPct}%</span>
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
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              ) : null}
              {canChangeStatus ? (
                <DropdownMenuItem onClick={onStatusOpen}>
                  Change status
                </DropdownMenuItem>
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
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdateRecord[]>(
    []
  )
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([...PROJECT_STATUS])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    ...PROJECT_CATEGORY,
  ])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")
  const [municipalityFilter, setMunicipalityFilter] = useState("all")
  const [barangayFilter, setBarangayFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [municipalityPickerOpen, setMunicipalityPickerOpen] = useState(false)
  const [barangayPickerOpen, setBarangayPickerOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectRecord | null>(null)
  const [form, setForm] = useState<ProjectFormState>(emptyForm())
  const [moaFiles, setMoaFiles] = useState<File[]>([])
  const [projectPhotoFiles, setProjectPhotoFiles] = useState<File[]>([])
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([])
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [retainedMoaNames, setRetainedMoaNames] = useState<string[]>([])
  const [retainedPhotoNames, setRetainedPhotoNames] = useState<string[]>([])
  const [retainedResolutionNames, setRetainedResolutionNames] = useState<
    string[]
  >([])
  const [retainedSupportingNames, setRetainedSupportingNames] = useState<
    string[]
  >([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [statusTarget, setStatusTarget] = useState<ProjectRecord | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [importResult, setImportResult] = useState<ProjectImportResult | null>(
    null
  )
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const actor = getPocketBase().authStore?.record
  const canCreateProjects = actor
    ? canAccess(actor, "projects.create")
    : false
  const canUpdateProjects = actor
    ? canAccess(actor, "projects.update")
    : false
  const canDeleteProjects = actor
    ? canAccess(actor, "projects.delete")
    : false
  const actorRole = typeof actor?.role === "string" ? actor.role : undefined

  function clearUploadFiles() {
    setMoaFiles([])
    setProjectPhotoFiles([])
    setResolutionFiles([])
    setSupportingFiles([])
    setRetainedMoaNames([])
    setRetainedPhotoNames([])
    setRetainedResolutionNames([])
    setRetainedSupportingNames([])
  }

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const [rows, updateRows, nextStatusOptions, nextCategoryOptions] =
        await Promise.all([
          pb.collection("projects").getFullList(),
          pb.collection("progress_updates").getFullList().catch(() => []),
          loadOptionRecordNames(
            pb,
            "project_status_options",
            PROJECT_STATUS
          ).then((options) =>
            options.length > 0
              ? options
              : loadSelectFieldOptions(pb, "projects", "status", PROJECT_STATUS)
          ),
          loadOptionRecordNames(
            pb,
            "project_category_options",
            PROJECT_CATEGORY
          ).then((options) =>
            options.length > 0
              ? options
              : loadSelectFieldOptions(
                  pb,
                  "projects",
                  "category",
                  PROJECT_CATEGORY
                )
          ),
        ])
      setProjects(parseRecordList(projectRecordSchema, rows))
      const parsedUpdates = parseRecordList(
        progressUpdateRecordSchema,
        updateRows
      )
      parsedUpdates.sort((a, b) => {
        const aKey = a.created ?? a.updated_at ?? a.id
        const bKey = b.created ?? b.updated_at ?? b.id
        return bKey.localeCompare(aKey)
      })
      setProgressUpdates(parsedUpdates)
      setStatusOptions(nextStatusOptions)
      setCategoryOptions(nextCategoryOptions)
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const { live } = usePocketBaseRealtime(
    ["projects", "progress_updates"],
    () => {
      void loadProjects()
    }
  )

  const scopedProjects = useMemo(
    () => (actor?.role ? filterProjectsForUser(actor, projects) : projects),
    [actor, projects]
  )

  const progressByProjectId = useMemo(() => {
    const map = new Map<string, ProgressUpdateRecord[]>()
    for (const update of progressUpdates) {
      const list = map.get(update.project) ?? []
      list.push(update)
      map.set(update.project, list)
    }
    return map
  }, [progressUpdates])

  const filtered = useMemo(
    () =>
      filterProjects(scopedProjects, {
        query,
        category:
          category === "all"
            ? undefined
            : (category as ProjectRecord["category"]),
        status:
          status === "all" ? undefined : (status as ProjectRecord["status"]),
        municipality:
          municipalityFilter === "all" ? undefined : municipalityFilter,
        barangay: barangayFilter === "all" ? undefined : barangayFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [
      scopedProjects,
      query,
      category,
      status,
      municipalityFilter,
      barangayFilter,
      dateFrom,
      dateTo,
    ]
  )

  function openCreate() {
    if (!canCreateProjects) {
      return
    }
    setEditing(null)
    setForm(emptyForm())
    setMoaFiles([])
    setResolutionFiles([])
    setSupportingFiles([])
    setRetainedMoaNames([])
    setRetainedPhotoNames([])
    setRetainedResolutionNames([])
    setRetainedSupportingNames([])
    setFieldErrors({})
    setFormError(null)
    setDialogOpen(true)
  }

  function openImport() {
    if (!canCreateProjects) {
      return
    }
    setImportFiles([])
    setImportResult(null)
    setImportOpen(true)
  }

  function downloadImportTemplate() {
    const book = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([Array.from(PROJECT_IMPORT_HEADERS)])
    XLSX.utils.book_append_sheet(book, sheet, "Projects")
    XLSX.writeFile(book, "cppms-project-import-template.xlsx")
  }

  function openEdit(project: ProjectRecord) {
    if (!canUpdateProjects) {
      return
    }
    setEditing(project)
    setForm({
      name: project.name,
      description: project.description ?? "",
      category: project.category,
      status: project.status,
      municipality: project.municipality ?? "",
      barangay: project.barangay ?? "",
      location: project.location ?? "",
      contractor: project.contractor ?? "",
      budget_year: String(project.budget_year),
      number_of_students: project.number_of_students
        ? String(project.number_of_students)
        : "",
      funding_year: project.funding_year ? String(project.funding_year) : "",
      fund_source: project.fund_source ?? "",
      sub_account: project.sub_account ?? "",
      period_of_implementation: project.period_of_implementation ?? "",
      bid_price:
        project.bid_price === undefined || project.bid_price === null
          ? ""
          : String(project.bid_price),
    })
    setMoaFiles([])
    setProjectPhotoFiles([])
    setResolutionFiles([])
    setSupportingFiles([])
    setRetainedMoaNames(namesOnRecord(project.moa_file))
    setRetainedPhotoNames(namesOnRecord(project.project_photos))
    setRetainedResolutionNames(namesOnRecord(project.resolution_file))
    setRetainedSupportingNames(namesOnRecord(project.supporting_docs))
    setFieldErrors({})
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    const parsed = projectMutateSchemaForActor(actorRole, !editing, {
      form: true,
    }).safeParse({
      name: form.name,
      description: form.description,
      category: form.category,
      status: form.status,
      municipality: form.municipality || undefined,
      barangay: form.barangay || undefined,
      location: form.location,
      contractor: form.contractor,
      budget_year: form.budget_year,
      number_of_students:
        form.category === "Scholarship"
          ? form.number_of_students || undefined
          : undefined,
      funding_year: form.funding_year || undefined,
      fund_source: form.fund_source || undefined,
      sub_account: form.sub_account || undefined,
      period_of_implementation: form.period_of_implementation || undefined,
      bid_price: form.bid_price || undefined,
      progress_pct: editing?.progress_pct ?? 0,
    })

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    if (editing ? !canUpdateProjects : !canCreateProjects) {
      setFormError(
        editing
          ? "You do not have permission to update projects."
          : "You do not have permission to create projects."
      )
      return
    }

    setFieldErrors({})
    setSaving(true)
    const pb = getPocketBase()
    const payload = projectPayloadForActor(
      actorRole,
      editing,
      !editing,
      parsed.data
    )
    const owned = ownedProjectFieldsForActor(actorRole, editing, !editing)
    const allowsField = (field: string) => owned.has("*") || owned.has(field)
    const fileFields: ProjectFileFieldInput[] = [
      {
        allowed: allowsField("moa_file"),
        key: "moa_file",
        files: allowsField("moa_file") ? moaFiles : [],
        retainedNames: retainedMoaNames,
        originalNames: namesOnRecord(editing?.moa_file),
      },
      {
        allowed: allowsField("project_photos"),
        key: "project_photos",
        files: allowsField("project_photos") ? projectPhotoFiles : [],
        retainedNames: retainedPhotoNames,
        originalNames: namesOnRecord(editing?.project_photos),
      },
      {
        allowed: allowsField("resolution_file"),
        key: "resolution_file",
        files: allowsField("resolution_file") ? resolutionFiles : [],
        retainedNames: retainedResolutionNames,
        originalNames: namesOnRecord(editing?.resolution_file),
      },
      {
        allowed: allowsField("supporting_docs"),
        key: "supporting_docs",
        files: allowsField("supporting_docs") ? supportingFiles : [],
        retainedNames: retainedSupportingNames,
        originalNames: namesOnRecord(editing?.supporting_docs),
      },
    ]

    try {
      if (projectFileFieldsDirty(fileFields)) {
        const formData = new FormData()
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        }
        appendProjectFileFields(formData, fileFields)

        if (editing) {
          await pb.collection("projects").update(editing.id, formData)
        } else {
          await pb.collection("projects").create(formData)
        }
      } else if (editing) {
        await pb.collection("projects").update(editing.id, payload)
      } else {
        await pb.collection("projects").create(payload)
      }

      setDialogOpen(false)
      await loadProjects()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save project."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleImportProjects() {
    if (!canCreateProjects || importing) {
      return
    }

    if (importFiles.length === 0) {
      setImportResult({
        imported: 0,
        total: 0,
        errors: ["Choose at least one Excel file before importing."],
      })
      return
    }

    const invalidFile = importFiles.find((file) => !/\.(xlsx|xls)$/i.test(file.name))
    if (invalidFile) {
      setImportResult({
        imported: 0,
        total: 0,
        errors: [`${invalidFile.name} must be an .xlsx or .xls workbook.`],
      })
      return
    }

    setImporting(true)
    const errors: string[] = []
    let imported = 0
    let total = 0

    try {
      const pb = getPocketBase()

      for (const file of importFiles) {
        const workbook = XLSX.read(await file.arrayBuffer(), {
          type: "array",
        })
        const firstSheetName = workbook.SheetNames[0]
        const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined
        const rows = sheet
          ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
              defval: "",
            })
          : []
        total += rows.length

        for (const [index, row] of rows.entries()) {
          const rowNumber = index + 2
          const name = importCellText(row, "Project Name")
          const bidPriceValue = importCellText(row, "Bid Price")
          const bidPrice = bidPriceValue ? parseImportBudget(bidPriceValue) : undefined

          if (!name) {
            errors.push(importRowError(file, rowNumber, "Project Name is required."))
            continue
          }
          if (bidPriceValue && bidPrice === null) {
            errors.push(
              importRowError(file, rowNumber, "Bid Price must be a valid amount.")
            )
            continue
          }

          const parsed = projectMutateSchemaForActor(actorRole, true).safeParse({
            name,
            description: importCellText(row, "Description") || undefined,
            location: importCellText(row, "Location") || undefined,
            contractor: importCellText(row, "Contractor") || undefined,
            bid_price: bidPrice,
            category: "Infrastructure",
            status: "Planning",
            budget_year: new Date().getFullYear(),
            progress_pct: 0,
          })

          if (!parsed.success) {
            const message = parsed.error.issues[0]?.message ?? "Invalid row data."
            errors.push(importRowError(file, rowNumber, message))
            continue
          }

          try {
            await pb.collection("projects").create(
              projectPayloadForActor(actorRole, null, true, parsed.data)
            )
            imported += 1
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Project create failed."
            errors.push(importRowError(file, rowNumber, message))
          }
        }
      }

      setImportResult({ imported, total, errors })
      await loadProjects()
    } finally {
      setImporting(false)
    }
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
      .map((location) => {
        const hierarchy = getLocationHierarchy(location)
        if (hierarchy.isBarangay) {
          return {
            id: `municipality-${location.id}`,
            name: hierarchy.municipality,
          }
        }

        return {
          id: location.id,
          name: location.municipality_name || location.name,
        }
      })
      .filter((location) => location.name)

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
      .map((location) => ({
        id: location.id,
        ...getLocationHierarchy(location),
      }))
      .filter(
        (location) =>
          location.isBarangay && location.municipality === form.municipality
      )
      .map((location) => ({ id: location.id, name: location.barangay }))
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

  const ownershipRecord = {
    ...(editing ?? {}),
    category: form.category,
  }
  const fieldLocked = (field: string) =>
    !isProjectFieldEditable(actorRole, field, ownershipRecord, !editing)
  const FieldOwnerHint = ({ field }: { field: string }) => {
    if (!fieldLocked(field)) return null
    const label = projectFieldFilledByLabel(field)
    return label ? <FieldDescription>{label}</FieldDescription> : null
  }
  const formStatusOptions = statusOptionsForActor(
    actorRole,
    form.status,
    ownershipRecord,
    statusOptions
  )

  const filterBarangayChoices = useMemo(() => {
    if (municipalityFilter === "all") {
      return []
    }

    return uniqueByName(
      locations
        .map((location) => ({
          id: location.id,
          ...getLocationHierarchy(location),
        }))
        .filter(
          (location) =>
            location.isBarangay && location.municipality === municipalityFilter
        )
        .map((location) => ({ id: location.id, name: location.barangay }))
        .filter((location) => location.name)
    )
  }, [locations, municipalityFilter])

  const ongoing = scopedProjects.filter(
    (project) => project.status === "Ongoing"
  ).length
  const planning = scopedProjects.filter(
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
          { label: "Total", value: String(scopedProjects.length) },
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
              {statusOptions.map((value) => (
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
              {categoryOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={municipalityFilter}
            onValueChange={(value) => {
              setMunicipalityFilter(value)
              setBarangayFilter("all")
            }}
          >
            <SelectTrigger aria-label="Filter by municipality">
              <SelectValue placeholder="Municipality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All municipalities</SelectItem>
              {municipalityChoices.map((location) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={barangayFilter}
            onValueChange={setBarangayFilter}
            disabled={municipalityFilter === "all"}
          >
            <SelectTrigger aria-label="Filter by barangay">
              <SelectValue placeholder="Barangay" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All barangays</SelectItem>
              {filterBarangayChoices.map((location) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangeFilter
            id="projects-date-range"
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        </div>
        {canCreateProjects ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={openImport}>
              Import
            </Button>
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
              progressPct={effectiveProgressPct(
                project,
                progressByProjectId.get(project.id) ?? []
              )}
              onEdit={() => openEdit(project)}
              onDelete={() => void handleDelete(project)}
              onStatusOpen={() => setStatusTarget(project)}
              canUpdate={canUpdateProjects}
              canDelete={canDeleteProjects}
              canChangeStatus={false}
            />
          ))}
        </div>
      )}

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) {
            setImportFiles([])
            setImportResult(null)
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import projects</DialogTitle>
            <DialogDescription>
              Upload one or more Excel workbooks with the project text fields for this
              import phase.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              Required headers: {PROJECT_IMPORT_HEADERS.join(", ")}.
            </div>
            <Field>
              <FieldLabel htmlFor="project-import-file">Excel files</FieldLabel>
              <Input
                id="project-import-file"
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={(event) => {
                  setImportFiles(Array.from(event.target.files ?? []))
                  setImportResult(null)
                }}
              />
            </Field>
            {importResult ? (
              <div className="rounded-lg border p-3 text-sm" role="status">
                <p className="font-medium">{formatImportSummary(importResult)}</p>
                {importResult.errors.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">
                    {importResult.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={downloadImportTemplate}
            >
              Download template
            </Button>
            <Button
              type="button"
              onClick={() => void handleImportProjects()}
              disabled={importing}
            >
              {importing ? "Importing..." : "Import projects"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit project" : "New project"}
            </DialogTitle>
            <DialogDescription>
              Enter the project details, funding, dates, and supporting
              documents.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {formError ? <FieldError>{formError}</FieldError> : null}
            <FieldSet>
              <Field data-invalid={Boolean(fieldErrors.name)}>
                <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                <FieldOwnerHint field="name" />
                <Input
                  id="project-name"
                  value={form.name}
                  disabled={fieldLocked("name")}
                  aria-invalid={Boolean(fieldErrors.name)}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
                <FieldError>{fieldErrors.name}</FieldError>
              </Field>
              <Field data-invalid={Boolean(fieldErrors.description)}>
                <FieldLabel htmlFor="project-description">Description</FieldLabel>
                <FieldOwnerHint field="description" />
                <Textarea
                  id="project-description"
                  value={form.description}
                  disabled={fieldLocked("description")}
                  aria-invalid={Boolean(fieldErrors.description)}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
                <FieldError>{fieldErrors.description}</FieldError>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldErrors.category)}>
                  <FieldLabel>Category</FieldLabel>
                  <FieldOwnerHint field="category" />
                  <Select
                    value={form.category}
                    disabled={fieldLocked("category")}
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
                    <SelectTrigger
                      aria-label="Category"
                      aria-invalid={Boolean(fieldErrors.category)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldErrors.category}</FieldError>
                </Field>
                <Field data-invalid={Boolean(fieldErrors.status)}>
                  <FieldLabel>Status</FieldLabel>
                  <FieldOwnerHint field="status" />
                  <Select
                    value={form.status}
                    disabled={fieldLocked("status")}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        status: value as ProjectRecord["status"],
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label="Status"
                      aria-invalid={Boolean(fieldErrors.status)}
                      disabled={fieldLocked("status")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formStatusOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldErrors.status}</FieldError>
                </Field>
              </div>
              {form.category === "Scholarship" ? (
                <Field data-invalid={Boolean(fieldErrors.number_of_students)}>
                  <FieldLabel htmlFor="project-number-of-students">
                    Number of Students
                  </FieldLabel>
                  <FieldOwnerHint field="number_of_students" />
                  <Input
                    id="project-number-of-students"
                    type="number"
                    min={1}
                    value={form.number_of_students}
                    disabled={fieldLocked("number_of_students")}
                    aria-invalid={Boolean(fieldErrors.number_of_students)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        number_of_students: event.target.value,
                      })
                    }
                  />
                  <FieldError>{fieldErrors.number_of_students}</FieldError>
                </Field>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldErrors.municipality)}>
                  <FieldLabel>Municipality</FieldLabel>
                  <FieldOwnerHint field="municipality" />
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
                    disabled={fieldLocked("municipality")}
                  />
                  <FieldError>{fieldErrors.municipality}</FieldError>
                </Field>
                <Field>
                  <FieldLabel>Barangay</FieldLabel>
                  <FieldOwnerHint field="barangay" />
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
                    disabled={!form.municipality || fieldLocked("barangay")}
                  />
                </Field>
              </div>
              <Field data-invalid={Boolean(fieldErrors.location)}>
                <FieldLabel htmlFor="project-location">Location</FieldLabel>
                <FieldOwnerHint field="location" />
                <Input
                  id="project-location"
                  value={form.location}
                  disabled={fieldLocked("location")}
                  aria-invalid={Boolean(fieldErrors.location)}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                />
                <FieldError>{fieldErrors.location}</FieldError>
              </Field>
              <FundSourceFields
                value={{
                  year: form.funding_year,
                  mainAccount: form.fund_source,
                  subAccount: form.sub_account,
                }}
                onChange={(fundSource) =>
                  setForm({
                    ...form,
                    funding_year: fundSource.year,
                    fund_source: fundSource.mainAccount,
                    sub_account: fundSource.subAccount,
                  })
                }
                fieldErrors={{
                  year: fieldErrors.funding_year,
                  main_account: fieldErrors.fund_source,
                  sub_account: fieldErrors.sub_account,
                }}
                idPrefix="project"
                yearLabel="Funding Year"
                disabled={fieldLocked("fund_source")}
              />
              <FieldOwnerHint field="fund_source" />
              <Field>
                <FieldLabel htmlFor="project-period">
                  Period of Implementation
                </FieldLabel>
                <FieldOwnerHint field="period_of_implementation" />
                <Input
                  id="project-period"
                  value={form.period_of_implementation}
                  disabled={fieldLocked("period_of_implementation")}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      period_of_implementation: event.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-contractor">Contractor</FieldLabel>
                <FieldOwnerHint field="contractor" />
                <Input
                  id="project-contractor"
                  value={form.contractor}
                  disabled={fieldLocked("contractor")}
                  onChange={(event) =>
                    setForm({ ...form, contractor: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldErrors.budget_year)}>
                  <FieldLabel htmlFor="project-year">Budget year</FieldLabel>
                  <FieldOwnerHint field="budget_year" />
                  <Input
                    id="project-year"
                    type="number"
                    value={form.budget_year}
                    disabled={fieldLocked("budget_year")}
                    aria-invalid={Boolean(fieldErrors.budget_year)}
                    onChange={(event) =>
                      setForm({ ...form, budget_year: event.target.value })
                    }
                  />
                  <FieldError>{fieldErrors.budget_year}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="project-bid-price">Bid price (PHP)</FieldLabel>
                  <FieldOwnerHint field="bid_price" />
                  <Input
                    id="project-bid-price"
                    type="number"
                    min={0}
                    value={form.bid_price}
                    disabled={fieldLocked("bid_price")}
                    onChange={(event) =>
                      setForm({ ...form, bid_price: event.target.value })
                    }
                  />
                </Field>
              </div>
              <FieldSet className="space-y-2 border-t pt-3">
                <FieldDescription className="text-sm font-medium text-foreground">
                  Required documents
                </FieldDescription>
                <div className="space-y-1">
                  <FieldOwnerHint field="moa_file" />
                  <DocumentUploadField
                    id="moa-file"
                    label="Memorandum of Agreement"
                    files={moaFiles}
                    existingNames={retainedMoaNames}
                    onExistingNamesChange={setRetainedMoaNames}
                    onChange={setMoaFiles}
                    disabled={fieldLocked("moa_file")}
                  />
                </div>
                <div className="space-y-1">
                  <FieldOwnerHint field="project_photos" />
                  <DocumentUploadField
                    id="project-photos"
                    label="Project photos"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    helperText="JPG, PNG, WEBP"
                    files={projectPhotoFiles}
                    existingNames={retainedPhotoNames}
                    onExistingNamesChange={setRetainedPhotoNames}
                    onChange={setProjectPhotoFiles}
                    disabled={fieldLocked("project_photos")}
                  />
                </div>
                <div className="space-y-1">
                  <FieldOwnerHint field="resolution_file" />
                  <DocumentUploadField
                    id="resolution-file"
                    label="Resolution"
                    files={resolutionFiles}
                    existingNames={retainedResolutionNames}
                    onExistingNamesChange={setRetainedResolutionNames}
                    onChange={setResolutionFiles}
                    disabled={fieldLocked("resolution_file")}
                  />
                </div>
                <div className="space-y-1">
                  <FieldOwnerHint field="supporting_docs" />
                  <DocumentUploadField
                    id="supporting-file"
                    label="Supporting project documents"
                    multiple
                    files={supportingFiles}
                    existingNames={retainedSupportingNames}
                    onExistingNamesChange={setRetainedSupportingNames}
                    onChange={setSupportingFiles}
                    disabled={fieldLocked("supporting_docs")}
                  />
                </div>
              </FieldSet>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Select the next status for this project.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1">
            {statusOptions.map((value) => (
              <li key={value}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    if (statusTarget)
                      void handleStatusChange(
                        statusTarget,
                        value as ProjectRecord["status"]
                      )
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
