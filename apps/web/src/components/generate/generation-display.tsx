import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  type GeneratedLogo,
  type GenerationStatus,
  type ImageCount,
} from "@/types/generate";
import { LogoCard } from "@/components/global/logo-card";
import { LogoPreviewDialog } from "@/components/global/logo-preview-dialog";
import { ImageLoadingState } from "@/components/global/image-loading-state";
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
import { downloadImage } from "@/lib/download";
import { LoadingStatusIndicator } from "@/components/global/loading-status-indicator";

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

function getGeneratingLabel(
  imageCount: ImageCount,
  completedCount?: number,
): string {
  if (imageCount === 1) return "Generating logo...";

  if (typeof completedCount === "number" && completedCount < imageCount) {
    return `Generating logos ${completedCount}/${imageCount}...`;
  }

  return "Generating logos...";
}

function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick?: (s: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="bg-primary/10 flex size-16 items-center justify-center">
        <SparkleIcon weight="duotone" className="text-primary size-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold tracking-tight">
          Create your logo
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm">
          Describe the logo you want and we&apos;ll generate it for you.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick?.(suggestion)}
            className="bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer border px-4 py-2.5 text-xs transition-colors"
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
  const label = getGeneratingLabel(imageCount);

  return (
    <ImageLoadingState
      label={label}
      imageCount={imageCount}
      className={isMobile && imageCount > 1 ? "px-4" : undefined}
    />
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
      <p className="text-destructive text-sm">{error}</p>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-2"
          onClick={onRetry}
        >
          <ArrowClockwiseIcon weight="bold" className="size-4" />
          Retry
        </Button>
      ) : null}
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
            i === activeIndex ? "bg-primary" : "bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function ResultsView({
  results,
  onCardClick,
  onDownload,
  onEditWithAI,
  onOpenInCanvas,
}: {
  results: GeneratedLogo[];
  onCardClick: (logo: GeneratedLogo) => void;
  onDownload: (logo: GeneratedLogo) => void;
  onEditWithAI: (logo: GeneratedLogo) => void;
  onOpenInCanvas: (logo: GeneratedLogo) => void;
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

  if (results.length === 1) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LogoCard
            logo={results[0]}
            onClick={onCardClick}
            onDownload={onDownload}
            onEditWithAI={onEditWithAI}
            onOpenInCanvas={onOpenInCanvas}
          />
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <Carousel className="w-full max-w-sm" setApi={setCarouselApi}>
          <CarouselContent>
            {results.map((logo) => (
              <CarouselItem key={logo.id}>
                <LogoCard
                  logo={logo}
                  onClick={onCardClick}
                  onDownload={onDownload}
                  onEditWithAI={onEditWithAI}
                  onOpenInCanvas={onOpenInCanvas}
                />
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
      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        {results.map((logo) => (
          <LogoCard
            key={logo.id}
            logo={logo}
            onClick={onCardClick}
            onDownload={onDownload}
            onEditWithAI={onEditWithAI}
            onOpenInCanvas={onOpenInCanvas}
          />
        ))}
      </div>
    </div>
  );
}

function PollingView({
  results,
  imageCount,
  onCardClick,
  onDownload,
  onEditWithAI,
  onOpenInCanvas,
}: {
  results: GeneratedLogo[];
  imageCount: ImageCount;
  onCardClick: (logo: GeneratedLogo) => void;
  onDownload: (logo: GeneratedLogo) => void;
  onEditWithAI: (logo: GeneratedLogo) => void;
  onOpenInCanvas: (logo: GeneratedLogo) => void;
}) {
  const skeletonsNeeded = Math.max(0, imageCount - results.length);
  const statusLabel = getGeneratingLabel(
    imageCount,
    skeletonsNeeded > 0 ? results.length : undefined,
  );

  const renderGrid = () => (
    <div
      className={cn(
        "grid w-full gap-4",
        imageCount === 1 ? "max-w-md grid-cols-1" : "max-w-2xl grid-cols-2",
      )}
    >
      {results.map((logo) => (
        <LogoCard
          key={logo.id}
          logo={logo}
          onClick={onCardClick}
          onDownload={onDownload}
          onEditWithAI={onEditWithAI}
          onOpenInCanvas={onOpenInCanvas}
        />
      ))}
      {Array.from({ length: skeletonsNeeded }, (_, i) => (
        <Skeleton
          key={`skel-${i}`}
          className="border-border/10 aspect-square w-full rounded-none border"
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 px-4">
      <LoadingStatusIndicator label={statusLabel} subtle />
      {renderGrid()}
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
  const navigate = useNavigate();
  const [previewLogo, setPreviewLogo] = useState<GeneratedLogo | null>(null);
  const handleCanvasOpen = (logo: GeneratedLogo) => {
    navigate({
      to: "/canvas/$imageId",
      params: { imageId: logo.id },
    });
  };

  const handleDownload = async (logo: GeneratedLogo) => {
    await downloadImage(logo.url, `quicklogo-${logo.id}.png`);
  };

  const handleEditWithAI = (logo: GeneratedLogo) => {
    navigate({
      to: "/edit/$imageId",
      params: { imageId: logo.id },
    });
  };

  const content = (() => {
    switch (status) {
      case "idle":
        return <EmptyState onSuggestionClick={onSuggestionClick} />;
      case "generating":
        return <LoadingState imageCount={imageCount} />;
      case "polling":
        return (
          <PollingView
            results={results}
            imageCount={imageCount}
            onCardClick={setPreviewLogo}
            onDownload={handleDownload}
            onEditWithAI={handleEditWithAI}
            onOpenInCanvas={handleCanvasOpen}
          />
        );
      case "error":
        return (
          <ErrorState
            error={error ?? "Something went wrong"}
            onRetry={onRetry}
          />
        );
      case "done":
        return (
          <ResultsView
            results={results}
            onCardClick={setPreviewLogo}
            onDownload={handleDownload}
            onEditWithAI={handleEditWithAI}
            onOpenInCanvas={handleCanvasOpen}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {content}

      <LogoPreviewDialog
        logo={previewLogo}
        open={!!previewLogo}
        onOpenChange={(open) => {
          if (!open) setPreviewLogo(null);
        }}
        onDownload={handleDownload}
        onEditWithAI={handleEditWithAI}
        onOpenInCanvas={handleCanvasOpen}
      />
    </div>
  );
}
