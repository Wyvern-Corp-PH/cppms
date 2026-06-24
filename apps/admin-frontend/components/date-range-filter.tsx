"use client"

import { format, isValid, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

type DateRangeFilterProps = {
  id: string
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  className?: string
}

function parseDate(value: string) {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}

function formatDateInput(date: Date | undefined) {
  return date ? format(date, "yyyy-MM-dd") : ""
}

function formatTriggerLabel(from: string, to: string) {
  const fromDate = parseDate(from)
  const toDate = parseDate(to)

  if (fromDate && toDate) {
    return `${format(fromDate, "MMM dd, yyyy")} - ${format(toDate, "MMM dd, yyyy")}`
  }
  if (fromDate) return `From ${format(fromDate, "MMM dd, yyyy")}`
  if (toDate) return `Until ${format(toDate, "MMM dd, yyyy")}`
  return "Pick date range"
}

export function DateRangeFilter({
  id,
  from,
  to,
  onFromChange,
  onToChange,
  className,
}: DateRangeFilterProps) {
  const fromDate = parseDate(from)
  const toDate = parseDate(to)
  const selectedRange: DateRange | undefined =
    fromDate || toDate ? { from: fromDate, to: toDate } : undefined
  const label = formatTriggerLabel(from, to)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-empty={!fromDate && !toDate}
          className={cn(
            "w-[260px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={fromDate ?? toDate}
          selected={selectedRange}
          numberOfMonths={2}
          onSelect={(range) => {
            onFromChange(formatDateInput(range?.from))
            onToChange(formatDateInput(range?.to))
          }}
        />
        <div className="grid gap-3 border-t p-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor={`${id}-from`}>From date</Label>
            <Input
              id={`${id}-from`}
              type="date"
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-to`}>To date</Label>
            <Input
              id={`${id}-to`}
              type="date"
              value={to}
              onChange={(event) => onToChange(event.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
