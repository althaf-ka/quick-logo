import React from "react";
import { Button } from "@quicklogo/ui/components/button";
import { SparkleIcon } from "@phosphor-icons/react";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { cn } from "@quicklogo/ui/lib/utils";
import { useBrandKitSection } from "./section-context";

interface SectionHeaderProps {
  title: string;
  sectionId: string;
  refineLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  sectionId,
  refineLabel = "Refine Section",
  className,
}: SectionHeaderProps) {
  const { targetSectionId, onRefine, refiningSectionId } = useBrandKitSection();
  const isTargeted = targetSectionId === sectionId;
  const isRefining = refiningSectionId === sectionId;

  return (
    <div className={cn("flex items-center justify-between pb-3", className)}>
      <h3 className="font-mono text-[11px] font-black tracking-widest uppercase">
        {title}
      </h3>
      {onRefine ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isRefining}
          className={cn(
            "h-auto cursor-pointer gap-1.5 border px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider uppercase transition-all active:scale-95",
            isTargeted
              ? "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30"
              : "text-foreground/70 hover:bg-primary/10 hover:text-primary",
          )}
          onClick={() => onRefine(isTargeted ? "" : sectionId)}
        >
          <SparkleIcon className="text-primary size-3" />
          {isRefining ? "Processing..." : isTargeted ? "Cancel" : refineLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Wraps a section's content. When refining, shows a skeleton overlay
 * with a pulsing animation covering the entire content area.
 */
export function SectionContent({
  sectionId,
  targetItemId,
  children,
  className,
}: {
  sectionId: string;
  targetItemId?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { refiningSectionId, targetItemId: ctxTargetItemId } =
    useBrandKitSection();
  const isRefining =
    refiningSectionId === sectionId &&
    (!targetItemId || ctxTargetItemId === targetItemId);
  return (
    <div className={cn("relative", className)}>
      {children}
      {isRefining ? (
        <div className="animate-in fade-in absolute inset-0 z-10 flex items-center justify-center duration-200">
          <Skeleton className="absolute inset-0 opacity-60" />
          <div className="relative z-20 flex items-center gap-2">
            <span className="bg-primary size-1.5 animate-ping" />
            <p className="text-muted-foreground animate-pulse font-mono text-[10px] font-bold tracking-widest uppercase">
              Regenerating...
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
