import { cn } from "@quicklogo/ui/lib/utils";

interface LoadingStatusIndicatorProps {
  label: string;
  className?: string;
  subtle?: boolean;
}

export function LoadingStatusIndicator({
  label,
  className,
  subtle = false,
}: LoadingStatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "size-2 animate-ping rounded-none",
          subtle ? "bg-primary/60" : "bg-primary",
        )}
      />
      <p
        className={cn(
          "animate-pulse text-xs font-semibold tracking-widest uppercase",
          subtle ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {label}
      </p>
    </div>
  );
}
