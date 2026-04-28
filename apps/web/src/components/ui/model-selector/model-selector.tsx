import * as React from "react";
import { MODELS, type ModelOption } from "@quicklogo/ai-providers/models";
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
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

const MODEL_ICONS = {
  lightning: LightningIcon,
  brain: BrainIcon,
  crown: CrownIcon,
  shuffle: ShuffleIcon,
} as const;

/**
 * User-friendly metadata for each model.
 * `label` is the primary thing users see — outcome-focused, not technical.
 * `description` rewrites the original to be simpler and action-oriented.
 */
const MODEL_META: Record<
  string,
  { label: string; description: string; recommended?: boolean }
> = {
  "quick-v1": {
    label: "Fast",
    description: "Quick drafts in seconds — great for exploring ideas",
  },
  "quick-hd": {
    label: "Balanced",
    description: "Sharp details with higher resolution output",
  },
  "quick-pro": {
    label: "Best Quality",
    description: "Production-ready logos with maximum detail",
    recommended: true,
  },
  "quick-remix": {
    label: "Remix",
    description: "Upload a reference image and create variations",
  },
  "quick-ideogram": {
    label: "Typography Expert",
    description: "Best for logos that need perfect text and lettering",
  },
  "quick-leo-fast": {
    label: "Creative",
    description: "Fast and artistic — great for unique visual styles",
  },
  "quick-seedream": {
    label: "Versatile",
    description: "Highly detailed, works well with or without references",
  },
};



interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  models?: ModelOption[];
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  models = MODELS,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedModel = models.find((m) => m.id === value) || models[0];

  const Icon = selectedModel ? MODEL_ICONS[selectedModel.icon] : LightningIcon;
  const selectedMeta = selectedModel ? MODEL_META[selectedModel.id] : undefined;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "group bg-card hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-primary/50 relative flex w-full cursor-pointer items-center justify-between gap-3 border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-1",
          className,
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center">
            <Icon weight="fill" className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-xs font-semibold">
              {selectedMeta?.label || selectedModel?.name || "Select Model"}
            </span>
            {selectedModel && (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium">
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
            )}
          </div>
        </div>
        <CaretDownIcon
          className={cn(
            "text-muted-foreground size-3.5 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent
          className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-foreground text-xs font-semibold tracking-wide uppercase">
              Choose AI Model
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[11px]">
              Pick the best fit for your logo
            </DialogDescription>
          </DialogHeader>

          <div className="[&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-border max-h-[60vh] overflow-y-auto sm:max-h-[420px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="flex flex-col">
              {models.map((model) => {
                const ModelIcon = MODEL_ICONS[model.icon];
                const meta = MODEL_META[model.id];
                const isSelected = model.id === value;
                const isRecommended = meta?.recommended;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-start gap-3 border-b border-border/40 px-4 py-3.5 text-left transition-colors outline-none hover:bg-muted/50",
                      isSelected &&
                        "bg-primary/[0.07] hover:bg-primary/[0.07]",
                      isRecommended &&
                        !isSelected &&
                        "bg-muted/20",
                    )}
                  >
                    {/* Selected accent bar */}
                    {isSelected && (
                      <div className="bg-primary absolute inset-y-0 left-0 w-[3px]" />
                    )}

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
                            isSelected
                              ? "text-primary"
                              : "text-foreground",
                          )}
                        >
                          {meta?.label || model.name}
                        </span>
                        {isRecommended && (
                          <span className="bg-primary/15 text-primary inline-flex items-center gap-0.5 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider">
                            <StarIcon weight="fill" className="size-2" />
                            Recommended
                          </span>
                        )}
                      </div>

                      {/* Technical model name (secondary) */}
                      <span className="text-muted-foreground/60 text-[10px] font-medium capitalize">
                        {model.name}
                      </span>

                      {/* Description */}
                      <span className="text-muted-foreground text-[11px] leading-relaxed">
                        {meta?.description || model.description}
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
