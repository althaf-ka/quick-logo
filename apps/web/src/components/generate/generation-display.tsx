import { useState, useCallback, useEffect } from "react";
import {
  type GeneratedLogo,
  type GenerationStatus,
  type ImageCount,
} from "@/types/generate";
import { LogoCard } from "@/components/global/logo-card";
import { LogoPreviewDialog } from "@/components/global/logo-preview-dialog";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@quicklogo/ui/components/carousel";
import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { SparkleIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import { cn } from "@quicklogo/ui/lib/utils";

interface GenerationDisplayProps {
  status: GenerationStatus;
  results: GeneratedLogo[];
  imageCount: ImageCount;
  error?: string | null;
  onRetry?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
}

const PROMPT_SUGGESTIONS = [
  "A minimal owl logo for a tech startup",
  "A bold lettermark logo for a fitness brand",
  "A vintage emblem for a coffee shop",
];

function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick?: (s: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex size-16 items-center justify-center bg-primary/10">
        <SparkleIcon weight="duotone" className="size-8 text-primary" />
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold tracking-tight">
          Create your logo
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Describe the logo you want and we&apos;ll generate it for you.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick?.(suggestion)}
            className="cursor-pointer border bg-card px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            &ldquo;{suggestion}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingState({ imageCount }: { imageCount: ImageCount }) {
  const isMobile = useIsMobile();

  if (imageCount === 1) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex items-center gap-3">
          <span className="size-2 animate-ping bg-primary/60" />
          <p className="animate-pulse text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Generating logo...
          </p>
        </div>
        <div className="w-full max-w-xs">
          <Skeleton className="aspect-square w-full rounded-none border border-border/10" />
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <div className="flex items-center gap-3">
          <span className="size-2 animate-ping bg-primary/60" />
          <p className="animate-pulse text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Generating logos...
          </p>
        </div>
        <div className="w-full max-w-xs">
          <Skeleton className="aspect-square w-full rounded-none border border-border/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <span className="size-2 animate-ping bg-primary/60" />
        <p className="animate-pulse text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Generating logos...
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-2 gap-3">
        {Array.from({ length: imageCount }, (_, i) => (
          <Skeleton
            key={i}
            className="aspect-square w-full rounded-none border border-border/10"
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-destructive">{error}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-2"
          onClick={onRetry}
        >
          <ArrowClockwiseIcon weight="bold" className="size-4" />
          Retry
        </Button>
      )}
    </div>
  );
}

function DotIndicators({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  return (
    <div className="flex justify-center gap-1.5 pt-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            "size-1.5 transition-colors",
            i === activeIndex ? "bg-primary" : "bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function ResultsView({
  results,
  imageCount,
  onCardClick,
}: {
  results: GeneratedLogo[];
  imageCount: ImageCount;
  onCardClick: (logo: GeneratedLogo) => void;
}) {
  const isMobile = useIsMobile();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);

  const onSelect = useCallback(() => {
    if (!carouselApi) return;
    setActiveSlide(carouselApi.selectedScrollSnap());
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, onSelect]);

  if (imageCount === 1 && results.length === 1) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <LogoCard logo={results[0]} onClick={onCardClick} />
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <Carousel className="w-full max-w-xs" setApi={setCarouselApi}>
          <CarouselContent>
            {results.map((logo) => (
              <CarouselItem key={logo.id}>
                <LogoCard logo={logo} onClick={onCardClick} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <DotIndicators count={results.length} activeIndex={activeSlide} />
        </Carousel>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="grid w-full max-w-lg grid-cols-2 gap-3">
        {results.map((logo) => (
          <LogoCard key={logo.id} logo={logo} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}

export function GenerationDisplay({
  status,
  results,
  imageCount,
  error,
  onRetry,
  onSuggestionClick,
}: GenerationDisplayProps) {
  const [previewLogo, setPreviewLogo] = useState<GeneratedLogo | null>(null);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {status === "idle" && (
        <EmptyState onSuggestionClick={onSuggestionClick} />
      )}
      {status === "generating" && <LoadingState imageCount={imageCount} />}
      {status === "error" && (
        <ErrorState error={error ?? "Something went wrong"} onRetry={onRetry} />
      )}
      {status === "done" && (
        <ResultsView
          results={results}
          imageCount={imageCount}
          onCardClick={setPreviewLogo}
        />
      )}

      <LogoPreviewDialog
        logo={previewLogo}
        open={!!previewLogo}
        onOpenChange={(open) => !open && setPreviewLogo(null)}
        onDownload={() => {}}
        onEditWithAI={() => {}}
        onOpenInCanvas={() => {}}
      />
    </div>
  );
}
