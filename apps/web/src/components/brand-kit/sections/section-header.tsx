import { Button } from "@quicklogo/ui/components/button";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { cn } from "@quicklogo/ui/lib/utils";

interface SectionHeaderProps {
  title: string;
  sectionId: string;
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  sectionId,
  onRefine,
  isRefining,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between pb-3", className)}>
      <h3 className="font-mono text-[11px] font-black tracking-widest uppercase">
        {title}
      </h3>
      {onRefine && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isRefining}
          className="text-foreground/70 hover:text-primary hover:bg-primary/10 h-auto cursor-pointer gap-1.5 border px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider uppercase transition-all"
          onClick={() => onRefine(sectionId)}
        >
          <ArrowsClockwiseIcon
            weight="bold"
            className={cn("size-3", isRefining && "animate-spin")}
          />
          {isRefining ? "Refining..." : "Refine"}
        </Button>
      )}
    </div>
  );
}

/**
 * Wraps a section's content. When refining, shows a skeleton overlay
 * with a pulsing animation covering the entire content area.
 */
export function SectionContent({
  isRefining,
  children,
}: {
  isRefining?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {isRefining && (
        <div className="animate-in fade-in absolute inset-0 z-10 flex items-center justify-center duration-200">
          <Skeleton className="absolute inset-0 opacity-60" />
          <div className="relative z-20 flex items-center gap-2">
            <span className="bg-primary size-1.5 animate-ping" />
            <p className="text-muted-foreground animate-pulse font-mono text-[10px] font-bold tracking-widest uppercase">
              Regenerating...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
