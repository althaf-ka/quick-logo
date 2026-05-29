import type { ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

interface PageEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function PageEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PageEmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border/40 flex min-h-[360px] flex-col items-center justify-center border border-dashed p-12 text-center",
        className,
      )}
    >
      <div className="bg-muted/30 mb-4 rounded-full p-4">{icon}</div>
      <p className="font-mono text-xs font-black tracking-widest uppercase">
        {title}
      </p>
      <p className="text-muted-foreground/40 mt-1.5 max-w-md font-mono text-[10px] tracking-wide">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface PageErrorStateProps {
  title?: string;
  description?: string;
}

export function PageErrorState({
  title = "Failed to load",
  description = "There was an error communicating with the server. Please try refreshing the page.",
}: PageErrorStateProps) {
  return (
    <div className="border-destructive/20 bg-destructive/5 flex min-h-[300px] flex-col items-center justify-center border border-dashed p-12 text-center">
      <div className="bg-destructive/10 mb-4 rounded-full p-4">
        <WarningCircleIcon
          weight="duotone"
          className="text-destructive/60 size-10"
        />
      </div>
      <p className="text-destructive font-mono text-xs font-black tracking-widest uppercase">
        {title}
      </p>
      <p className="text-muted-foreground/60 mt-1.5 max-w-md font-mono text-[10px] tracking-wide">
        {description}
      </p>
    </div>
  );
}
