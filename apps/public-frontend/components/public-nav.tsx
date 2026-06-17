"use client"

import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { ThemeToggle } from "@/components/theme-toggle"

const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"

export function PublicNav() {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <ThemeToggle />
      <Button asChild size="sm" className="h-11 shrink-0 rounded-full px-4">
        <Link href={`${adminUrl}/login`}>Admin</Link>
      </Button>
    </div>
  )
}
