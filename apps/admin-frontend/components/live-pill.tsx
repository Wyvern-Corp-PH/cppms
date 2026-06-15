type LivePillProps = {
  className?: string
}

export function LivePill({ className }: LivePillProps) {
  return (
    <span
      data-testid="live-pill"
      className={[
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="bg-success size-1.5 rounded-full" aria-hidden />
      Live
    </span>
  )
}
