import * as React from "react";
import {
  MODELS,
  type ModelOption,
  type ModelContext,
} from "@quicklogo/ai-providers/models";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@quicklogo/ui/components/dialog";
import {
  LightningIcon,
  BrainIcon,
  CrownIcon,
  ShuffleIcon,
  CaretDownIcon,
  StarIcon,
  ApertureIcon,
  TextAaIcon,
  PaletteIcon,
  MagicWandIcon,
  PaintBrushIcon,
  SwatchesIcon,
  DiamondIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

const MODEL_ICONS = {
  lightning: LightningIcon,
  brain: BrainIcon,
  crown: CrownIcon,
  shuffle: ShuffleIcon,
  aperture: ApertureIcon,
  typography: TextAaIcon,
  palette: PaletteIcon,
  magic: MagicWandIcon,
  star: StarIcon,
  brush: PaintBrushIcon,
  swatches: SwatchesIcon,
  diamond: DiamondIcon,
} as const;

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  models?: ModelOption[];
  className?: string;
  variant?: "default" | "minimal";
  /**
   * Context determines which model gets the "Recommended" badge.
   * - "generate": Quick Pro is recommended
   * - "edit": SeeDream 4.5 is recommended
   */
  context?: ModelContext;
}

export function ModelSelector({
  value,
  onChange,
  models = MODELS,
  className,
  variant = "default",
  context = "generate",
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedModel = models.find((m) => m.id === value) || models[0];

  const Icon = selectedModel ? MODEL_ICONS[selectedModel.icon] : LightningIcon;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "group focus-visible:ring-primary/50 relative flex cursor-pointer items-center justify-between transition-all outline-none focus-visible:ring-1",
          variant === "minimal"
            ? "hover:bg-primary/5 h-8 w-fit gap-1.5 rounded-none border-none bg-transparent px-2.5"
            : "bg-card hover:bg-muted/30 hover:border-primary/40 w-full gap-3 border px-3 py-2",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center transition-colors",
              variant === "minimal"
                ? "text-primary size-4"
                : "bg-primary/10 text-primary size-7",
            )}
          >
            <Icon
              weight="fill"
              className={variant === "minimal" ? "size-3.5" : "size-4"}
            />
          </div>

          <div className="flex flex-col items-start leading-none">
            <span
              className={cn(
                "font-bold tracking-tight transition-colors",
                variant === "minimal"
                  ? "text-foreground/90 group-hover:text-primary text-[11px]"
                  : "text-foreground text-xs",
              )}
            >
              {selectedModel?.label || selectedModel?.name || "Select Model"}
            </span>
            {selectedModel && variant === "default" ? (
              <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px] font-medium">
                <span className="capitalize">{selectedModel.name}</span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-0.5 tabular-nums">
                  <LightningIcon
                    weight="fill"
                    className="text-primary/70 size-2.5"
                  />
                  {selectedModel.credits}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <CaretDownIcon
          className={cn(
            "text-muted-foreground/40 group-hover:text-muted-foreground size-3 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-foreground text-xs font-semibold tracking-wide uppercase">
              Choose AI Model
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[11px]">
              {context === "edit"
                ? "Pick the best model for editing your logo"
                : "Pick the best fit for your logo"}
            </DialogDescription>
          </DialogHeader>

          <div className="[&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-border max-h-[60vh] overflow-y-auto sm:max-h-[420px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="flex flex-col">
              {models.map((model) => {
                const ModelIcon = MODEL_ICONS[model.icon];
                const isSelected = model.id === value;
                const showRecommendedBadge =
                  context === "edit" ? model.bestForEdits : model.recommended;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "group border-border/40 hover:bg-muted/50 relative flex w-full cursor-pointer items-start gap-3 border-b px-4 py-3.5 text-left transition-all outline-none",
                      isSelected &&
                        "bg-primary/[0.06] shadow-[inset_0_0_20px_-10px_rgba(var(--primary),0.3)]",
                      showRecommendedBadge && !isSelected && "bg-muted/20",
                    )}
                  >
                    {/* Selected accent bar */}
                    {isSelected ? (
                      <div className="bg-primary absolute inset-y-0 left-0 w-[3px]" />
                    ) : null}

                    {/* Icon */}
                    <div
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      <ModelIcon weight="fill" className="size-4" />
                    </div>

                    {/* Content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {/* User-friendly label (primary) */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-bold",
                            isSelected ? "text-primary" : "text-foreground",
                          )}
                        >
                          {model.label}
                        </span>
                        {showRecommendedBadge ? (
                          <span className="bg-primary/15 text-primary inline-flex items-center gap-0.5 px-1.5 py-px text-[8px] font-bold tracking-wider uppercase">
                            <StarIcon weight="fill" className="size-2" />
                            Recommended
                          </span>
                        ) : null}
                      </div>

                      {/* Technical model name (secondary) */}
                      <span className="text-muted-foreground/60 text-[10px] font-medium capitalize">
                        {model.name}
                      </span>

                      {/* Description */}
                      <span className="text-muted-foreground text-[11px] leading-relaxed">
                        {model.friendlyDescription}
                      </span>
                    </div>

                    {/* Credits */}
                    <span className="text-muted-foreground mt-0.5 flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums">
                      <LightningIcon
                        weight="fill"
                        className="text-primary size-3"
                      />
                      {model.credits}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
