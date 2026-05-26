import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEditForm } from "@/hooks/use-edit-form";
import { getModelsForContext } from "@quicklogo/ai-providers/models";
import { EditHistoryPanel } from "./edit-history-panel";
import { PromptInput } from "@/components/global/prompt-input";
import { ImageLoadingState } from "@/components/global/image-loading-state";
import { downloadImage } from "@/lib/download";
import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";
import { cn } from "@quicklogo/ui/lib/utils";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { Button } from "@quicklogo/ui/components/button";
import { Spinner } from "@quicklogo/ui/components/spinner";
import {
  DownloadIcon,
  PaletteIcon,
  ClockCounterClockwiseIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
} as const;

const EDIT_MODELS = getModelsForContext("edit");

interface EditPageProps {
  imageId: string;
  imageUrl?: string;
  prompt?: string;
}

export function EditPage({
  imageId,
  imageUrl: initialImageUrl,
  prompt: initialPrompt,
}: EditPageProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    prompt,
    setPrompt,
    model,
    setModel,
    status,
    isEditing,
    history,
    selectedEntry,
    setSelectedEntry,
    handleEdit,
    sourceImageUrl,
    sourcePrompt,
    isHistoryBootstrapping,
    isMissingData,
  } = useEditForm({ imageId, initialImageUrl, initialPrompt });

  const handleDownload = async () => {
    const targetUrl = selectedEntry?.url ?? sourceImageUrl;
    if (!targetUrl) return;
    setIsDownloading(true);
    try {
      await downloadImage(
        targetUrl,
        `quicklogo-${selectedEntry?.id ?? imageId}.png`,
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCanvasOpen = () => {
    const targetUrl = selectedEntry?.url ?? sourceImageUrl;
    if (!targetUrl) return;

    navigate({
      to: "/canvas/$imageId",
      params: { imageId: selectedEntry?.id ?? imageId },
    });
  };

  const previewUrl = selectedEntry?.url ?? sourceImageUrl;
  const credits = useMemo(
    () => EDIT_MODELS.find((m) => m.id === model)?.credits ?? 3,
    [model],
  );

  const isWorking = status === "generating" || status === "polling";
  const areActionsDisabled = isWorking || isEditing || isDownloading;

  if (isMissingData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="bg-primary size-2 animate-ping" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium tracking-widest uppercase">
            Loading edit session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden p-4 md:p-6">
          <div className="w-full max-w-sm shrink-0 md:max-w-md">
            <div className="relative aspect-square w-full" style={CHECKER}>
              <img
                src={previewUrl}
                alt={selectedEntry?.prompt ?? sourcePrompt}
                className={cn(
                  "size-full object-contain p-6 transition-all duration-300",
                  isWorking
                    ? "opacity-30 blur-[2px] grayscale saturate-50"
                    : "blur-0 opacity-100 grayscale-0",
                )}
              />

              {isWorking ? (
                <ImageLoadingState label="Editing logo..." isOverlay />
              ) : null}
            </div>
          </div>
        </div>

        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleEdit}
          isLoading={isEditing}
          placeholder="Describe your changes (e.g., 'make it red', 'add a hat')..."
          contextPrompt={selectedEntry?.prompt || sourcePrompt}
          credits={credits}
          showModelSelector
          showConfigTrigger={isMobile}
          onConfigTrigger={() => setIsMobileDrawerOpen(true)}
          configIcon={
            <ClockCounterClockwiseIcon weight="bold" className="size-4" />
          }
          models={EDIT_MODELS}
          modelValue={model}
          onModelChange={setModel}
          modelContext="edit"
        />
      </div>

      {isMobile ? (
        <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
          <DrawerContent className="flex h-[80vh] flex-col px-0 pb-0">
            <DrawerHeader className="px-4 pb-2 text-left">
              <DrawerTitle className="text-sm">
                Edit Actions & History
              </DrawerTitle>
            </DrawerHeader>
            <div className="border-b px-4 pb-4">
              <div className="flex w-full items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 cursor-pointer gap-2 transition-opacity",
                    areActionsDisabled && "cursor-not-allowed opacity-60",
                  )}
                  disabled={areActionsDisabled}
                  onClick={handleDownload}
                >
                  {isDownloading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <DownloadIcon className="size-4" />
                  )}
                  <span className="inline">Download</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className={cn(
                    "flex-1 cursor-pointer gap-2 transition-opacity",
                    areActionsDisabled && "cursor-not-allowed opacity-60",
                  )}
                  disabled={areActionsDisabled}
                  onClick={handleCanvasOpen}
                >
                  <PaletteIcon className="size-4" />
                  <span className="inline">Canvas</span>
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <EditHistoryPanel
                history={history}
                selectedEntry={selectedEntry}
                onSelectEntry={setSelectedEntry}
                isLocked={isWorking}
                className="h-full w-full border-0"
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}

      {!isMobile ? (
        <div className="relative flex h-full w-64 shrink-0 flex-col border-l">
          <div className="flex-1 overflow-hidden">
            {isHistoryBootstrapping ? (
              <div className="space-y-4 p-4">
                <h3 className="text-sm font-medium">Edit History</h3>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-none" />
                ))}
              </div>
            ) : (
              <EditHistoryPanel
                history={history}
                selectedEntry={selectedEntry}
                onSelectEntry={setSelectedEntry}
                isLocked={isWorking}
                className="h-full w-full border-l-0"
              />
            )}
          </div>

          <div className="bg-card flex shrink-0 flex-col gap-3 border-t p-4">
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className={cn(
                  "group border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-none transition-all",
                  areActionsDisabled && "cursor-not-allowed opacity-50",
                )}
                disabled={areActionsDisabled}
                onClick={() => {
                  const targetUrl = selectedEntry?.url ?? sourceImageUrl;
                  if (!targetUrl) return;
                  navigate({
                    to: "/brand-kit/create",
                    search: { imageId: selectedEntry?.id ?? imageId },
                  });
                }}
              >
                <SparkleIcon
                  weight="fill"
                  className="size-3.5 transition-transform group-hover:scale-110"
                />
                <span className="text-[11px] font-semibold tracking-tight">
                  Generate Brand Kit
                </span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "border-border/60 hover:bg-muted/50 w-full cursor-pointer justify-start gap-2 rounded-none text-[11px] font-medium transition-colors",
                  areActionsDisabled && "cursor-not-allowed opacity-60",
                )}
                disabled={areActionsDisabled}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <DownloadIcon className="size-3.5" />
                )}
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "border-border/60 hover:bg-muted/50 w-full cursor-pointer justify-start gap-2 rounded-none text-[11px] font-medium transition-colors",
                  areActionsDisabled && "cursor-not-allowed opacity-60",
                )}
                disabled={areActionsDisabled}
                onClick={handleCanvasOpen}
              >
                <PaletteIcon className="size-3.5" />
                Canvas
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
