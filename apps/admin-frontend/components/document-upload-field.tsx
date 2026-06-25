"use client"

import { FileUp, X } from "lucide-react"
import { useId, useRef, useState, type DragEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { cn } from "@workspace/ui/lib/utils"

export const DOCUMENT_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp"

export function fileIdentity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

type DocumentUploadFieldProps = {
  id: string
  label: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  files: File[]
  onChange: (files: File[]) => void
  existingNames?: string[]
  helperText?: string
  dropZoneText?: string
  error?: string
}

export function DocumentUploadField({
  id,
  label,
  accept = DOCUMENT_UPLOAD_ACCEPT,
  multiple = true,
  maxFiles = multiple ? 10 : 1,
  files,
  onChange,
  existingNames = [],
  helperText = "PDF, DOC, XLS, JPG, PNG",
  dropZoneText = "Click to upload or drag files here",
  error,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  const labelId = useId()
  const limitMessageId = useId()

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming)
    if (list.length === 0) return

    if (multiple) {
      const merged = [...files, ...list]
      if (merged.length > maxFiles) {
        setLimitMessage(`Only ${maxFiles} files allowed. Extra files were not added.`)
      } else {
        setLimitMessage(null)
      }
      onChange(merged.slice(0, maxFiles))
      return
    }

    setLimitMessage(null)
    onChange([list[0]!])
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragOver(false)
    addFiles(event.dataTransfer.files)
  }

  function removeFile(identity: string) {
    onChange(files.filter((file) => fileIdentity(file) !== identity))
  }

  const describedBy = [limitMessage ? limitMessageId : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ")

  return (
    <Field data-invalid={!!error}>
      <FieldLabel id={labelId} htmlFor={id}>
        {label}
      </FieldLabel>
      {existingNames.length > 0 ? (
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          {existingNames.map((name) => (
            <li key={name}>On record: {name}</li>
          ))}
        </ul>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-describedby={describedBy || undefined}
        aria-invalid={!!error}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDragOver(false)
          }
        }}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center transition-colors",
          dragOver
            ? "border-primary bg-muted/50"
            : "border-border bg-muted/20 hover:bg-muted/40"
        )}
      >
        <FileUp className="text-muted-foreground size-8" aria-hidden />
        <p className="text-sm">{dropZoneText}</p>
        <p className="text-muted-foreground text-xs">{helperText}</p>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        data-testid={`document-upload-input-${id}`}
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files)
          event.target.value = ""
        }}
      />
      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file) => {
            const identity = fileIdentity(file)
            return (
              <li
                key={identity}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(identity)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}
      <FieldDescription>{helperText}</FieldDescription>
      {limitMessage ? (
        <FieldError id={limitMessageId}>
          {limitMessage}
        </FieldError>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}
