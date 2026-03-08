import { cn } from "@quicklogo/ui/lib/utils";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { LoadingStatusIndicator } from "./loading-status-indicator";

interface ImageLoadingStateProps {
  label?: string;
  isOverlay?: boolean;
  imageCount?: number;
  className?: string;
}

export function ImageLoadingState({
  label = "Generating...",
  isOverlay = false,
  imageCount = 1,
  className,
}: ImageLoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        isOverlay
          ? "absolute inset-0 z-10 gap-4"
          : "flex-1 gap-6 p-6",
        className,
      )}
    >
      <LoadingStatusIndicator
        label={label}
        subtle={!isOverlay}
        className="relative z-20"
      />

      {isOverlay ? (
        <Skeleton className="absolute inset-4 z-10 rounded-none opacity-25" />
      ) : imageCount === 1 ? (
        <div className="w-full max-w-xs">
          <Skeleton className="border-border/10 aspect-square w-full rounded-none border" />
        </div>
      ) : (
        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          {Array.from({ length: imageCount }, (_, i) => (
            <Skeleton
              key={i}
              className="border-border/10 aspect-square w-full rounded-none border"
            />
          ))}
        </div>
      )}
    </div>
  );
}
