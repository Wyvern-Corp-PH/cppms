"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Link from "next/link"

import { formatPhp } from "@workspace/pocketbase/domain/format-currency"
import { parseRecordList, projectRecordSchema } from "@workspace/pocketbase/schemas"
import type { ProjectRecord } from "@workspace/pocketbase/types"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { AdminPortalPreview } from "@/components/admin-portal-preview"
import { usePocketBaseRealtime } from "@/hooks/use-pocketbase-realtime"
import { getPocketBase } from "@/lib/pocketbase"

const CAROUSEL_PAGE_SIZE = 6

function SegmentedProgress({ value }: { value: number }) {
  const segments = 10
  const filled = Math.round((value / 100) * segments)

  return (
    <div
      className="flex gap-0.5"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${value}% progress`}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span
          key={index}
          className={[
            "h-2 flex-1 rounded-sm",
            index < filled ? "bg-primary" : "bg-muted",
          ].join(" ")}
        />
      ))}
    </div>
  )
}

function ProjectCarouselCard({ project }: { project: ProjectRecord }) {
  return (
    <article className="min-w-[280px] rounded-[var(--radius-lg)] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium leading-snug">{project.name}</h3>
        <Badge variant="secondary">{project.status}</Badge>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        {project.location ?? "Location not set"} · {project.category}
      </p>
      <div className="mt-3">
        <SegmentedProgress value={project.progress_pct ?? 0} />
      </div>
      <p className="text-muted-foreground mt-2 text-xs tabular-nums">
        {formatPhp(project.total_budget ?? 0)}
      </p>
    </article>
  )
}

export function PublicLanding() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const carouselProjects = useMemo(() => {
    if (projects.length <= 1) {
      return projects
    }
    return [...projects, ...projects]
  }, [projects])

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: carouselProjects.length > 1,
    align: "start",
  })

  const loadProjects = useCallback(async () => {
    const rows = await getPocketBase().collection("projects").getFullList()
    const parsed = parseRecordList(projectRecordSchema, rows)
    parsed.sort((a, b) => {
      const aKey = a.created ?? a.id
      const bKey = b.created ?? b.id
      return bKey.localeCompare(aKey)
    })
    setProjects(parsed.slice(0, CAROUSEL_PAGE_SIZE))
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadProjects().catch(() => {
      setProjects([])
      setLoading(false)
    })
  }, [loadProjects])

  const { live } = usePocketBaseRealtime(["projects"], () => {
    void loadProjects()
  })

  useEffect(() => {
    if (!emblaApi || paused || carouselProjects.length <= 1) {
      return
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reducedMotion.matches) {
      return
    }

    const timer = window.setInterval(() => {
      emblaApi.scrollNext()
    }, 3500)

    return () => window.clearInterval(timer)
  }, [emblaApi, paused, carouselProjects.length])

  return (
    <>
      <section
        aria-labelledby="landing-hero-heading"
        className="relative border-b border-border px-4 py-16 md:py-24"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-64 max-w-3xl -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="border-border bg-card text-muted-foreground mb-6 inline-flex rounded-full border px-3 py-1 text-xs font-medium">
            Provincial records, available for review
          </p>
          <h1
            id="landing-hero-heading"
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl"
          >
            Cagayan provincial projects, open for review
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-relaxed">
            Official status, budget, and progress — read-only for citizens and partners.
            No sign-in required.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="rounded-full">
              <Link href={`${process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"}/login`}>
                Admin Portal
              </Link>
            </Button>
          </div>
          <div className="relative mx-auto mt-12 max-w-2xl">
            <AdminPortalPreview projects={projects} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="recent-projects-heading"
        className="px-4 py-12"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 id="recent-projects-heading" className="text-xl font-semibold">
                Provincial projects
              </h2>
              {live ? (
                <span className="text-muted-foreground text-xs">· Live</span>
              ) : null}
            </div>
            <Link
              href="/projects"
              className="text-primary text-sm font-medium hover:underline underline-offset-4"
            >
              See all
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-4" data-testid="landing-carousel-skeleton">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="bg-muted h-36 min-w-[280px] animate-pulse rounded-[var(--radius-lg)]"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed p-8 text-center">
              <p className="font-medium">No projects published yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Records will appear here once provincial staff add them.
              </p>
            </div>
          ) : (
            <div ref={emblaRef} className="overflow-hidden">
              <ul className="flex gap-4">
                {carouselProjects.map((project, index) => (
                  <li key={`${project.id}-${index}`}>
                    <ProjectCarouselCard project={project} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="accountability-heading"
        className="px-4 pb-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[var(--radius-lg)] border border-border bg-card px-6 py-8 md:px-8">
            <h2 id="accountability-heading" className="text-lg font-semibold">
              Public accountability
            </h2>
            <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
              The Provincial Project Monitoring System keeps a single authoritative record for
              each program. Staff update entries through a separate admin portal; this site
              reflects those records as they are published. If you need to report a discrepancy,
              contact the provincial office that manages the project.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
