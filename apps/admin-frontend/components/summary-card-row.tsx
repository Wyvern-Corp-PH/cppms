import { Progress } from "@workspace/ui/components/progress"
import { cn } from "@workspace/ui/lib/utils"

type SummaryCard = {
  label: string
  value: string
  footer?: string
  progressPct?: number
  testId?: string
  onClick?: () => void
  active?: boolean
}

type SummaryCardRowProps = {
  cards: SummaryCard[]
}

export function SummaryCardRow({ cards }: SummaryCardRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Wrapper = card.onClick ? "button" : "div"
        return (
          <Wrapper
            key={card.label}
            type={card.onClick ? "button" : undefined}
            onClick={card.onClick}
            className={cn(
              "rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 text-left",
              card.onClick && "transition-colors hover:bg-muted/40",
              card.active && "border-primary ring-1 ring-primary/30"
            )}
          >
            <p className="text-muted-foreground text-sm font-medium">{card.label}</p>
            <p
              className="mt-2 text-2xl font-semibold tabular-nums tracking-tight"
              data-testid={card.testId}
            >
              {card.value}
            </p>
            {card.footer ? (
              <p className="text-muted-foreground mt-1 text-xs">{card.footer}</p>
            ) : null}
            {typeof card.progressPct === "number" ? (
              <Progress className="mt-3 h-1.5" value={card.progressPct} aria-hidden />
            ) : null}
          </Wrapper>
        )
      })}
    </div>
  )
}
