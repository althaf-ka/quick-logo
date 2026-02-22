import { useRef, useState, useMemo } from "react";
import {
  type GenerateConfig,
  type ImageCount,
  type BackgroundType,
  MODELS,
  STYLES,
  COLOR_PALETTES,
  MAX_COLORS,
} from "@/types/generate";
import { Label } from "@quicklogo/ui/components/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@quicklogo/ui/components/combobox";
import { ToggleGroup, ToggleGroupItem } from "@quicklogo/ui/components/toggle-group";
import { Textarea } from "@quicklogo/ui/components/textarea";
import { Slider } from "@quicklogo/ui/components/slider";
import { Input } from "@quicklogo/ui/components/input";
import { Button } from "@quicklogo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@quicklogo/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { Separator } from "@quicklogo/ui/components/separator";
import {
  LightningIcon,
  BrainIcon,
  CrownIcon,
  XIcon,
  DiceFiveIcon,
  UploadIcon,
  SparkleIcon,
  PaletteIcon,
  QuestionIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

function ConfigField({
  label,
  tooltip,
  children,
  className,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-help text-muted-foreground/40 transition-colors hover:text-muted-foreground" />
              }
            >
              <QuestionIcon weight="fill" className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-52 text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}

const MODEL_ICONS = {
  lightning: LightningIcon,
  brain: BrainIcon,
  crown: CrownIcon,
} as const;

const STYLE_GRADIENTS: Record<string, string> = {
  minimal: "from-slate-200 to-slate-400",
  abstract: "from-violet-400 to-fuchsia-500",
  mascot: "from-amber-300 to-orange-400",
  lettermark: "from-sky-400 to-blue-600",
  "3d": "from-emerald-400 to-teal-600",
  emblem: "from-stone-400 to-stone-700",
  wordmark: "from-rose-400 to-pink-600",
  vintage: "from-yellow-600 to-amber-800",
};

interface GenerationSidebarProps {
  config: GenerateConfig;
  onConfigChange: <K extends keyof GenerateConfig>(
    key: K,
    value: GenerateConfig[K]
  ) => void;
  onReferenceImageChange?: (file: File | null) => void;
  className?: string;
}

export function GenerationSidebar({
  config,
  onConfigChange,
  onReferenceImageChange,
  className,
}: GenerationSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newColor, setNewColor] = useState("#6366f1");
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);

  const selectedStyle = useMemo(
    () => STYLES.find((s) => s.id === config.style),
    [config.style]
  );
  const selectedPalette = useMemo(
    () => COLOR_PALETTES.find((p) => p.id === config.colorPalette),
    [config.colorPalette]
  );

  return (
    <div
      className={cn(
        "flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-l bg-background p-4",
        "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/60",
        className
      )}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
        Configuration
      </h3>

      <ConfigField label="Model" tooltip="Better models cost more credits but produce higher quality.">
        <Combobox
          value={config.model}
          onValueChange={(val) => {
            if (val) onConfigChange("model", val);
          }}
        >
          <ComboboxInput
            placeholder="Select model..."
            className="[&_input]:!capitalize [&_input]:cursor-pointer [&_input]:caret-transparent cursor-pointer"
          />
          <ComboboxContent>
            <ComboboxList>
              {MODELS.map((model) => {
                const Icon = MODEL_ICONS[model.icon];
                return (
                  <ComboboxItem key={model.id} value={model.id} className="!py-2.5">
                    <div className="flex w-full items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center bg-primary/10">
                        <Icon weight="fill" className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold capitalize">{model.name}</span>
                          <span className="flex items-center gap-0.5 bg-primary/10 px-1.5 py-px text-[9px] font-bold tabular-nums text-primary">
                            <LightningIcon weight="fill" className="size-2" />
                            {model.credits}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {model.features.map((f) => (
                            <span key={f} className="border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ComboboxItem>
                );
              })}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </ConfigField>

      <ConfigField label="Style" tooltip="Visual style for your logo.">
        <button
          onClick={() => setStyleDialogOpen(true)}
          className="group flex w-full cursor-pointer items-center gap-3 border px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          {selectedStyle && (
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center bg-gradient-to-br text-[10px] font-bold text-white transition-transform duration-150 group-hover:scale-105",
                STYLE_GRADIENTS[selectedStyle.id]
              )}
            >
              {selectedStyle.name.charAt(0)}
            </div>
          )}
          <span className="flex-1 text-xs font-medium">
            {selectedStyle?.name ?? "Select style"}
          </span>
        </button>

        <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Choose Style</DialogTitle>
              <DialogDescription>Select a visual style</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-2 py-2">
              {STYLES.map((style) => {
                const isSelected = config.style === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => {
                      onConfigChange("style", style.id);
                      setStyleDialogOpen(false);
                    }}
                    className={cn(
                      "group/s flex cursor-pointer flex-col items-center gap-1.5 border p-2 transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "flex aspect-square w-full items-center justify-center bg-gradient-to-br transition-transform duration-150 group-hover/s:scale-[1.03]",
                        STYLE_GRADIENTS[style.id]
                      )}
                    >
                      <span className="text-xl font-black text-white/90 drop-shadow-sm">
                        {style.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium">{style.name}</span>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </ConfigField>

      <Separator />

      <ConfigField label="Images">
        <ToggleGroup
          value={[String(config.imageCount)]}
          onValueChange={(val) => {
            const latest = val[val.length - 1];
            if (latest) onConfigChange("imageCount", Number(latest) as ImageCount);
          }}
          variant="outline"
          className="w-full"
        >
          {([1, 2, 4] as const).map((n) => (
            <ToggleGroupItem key={n} value={String(n)} className="flex-1 text-xs">
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ConfigField>

      <ConfigField label="Colors" tooltip="Auto lets AI choose the best palette.">
        <Combobox
          value={config.colorPalette}
          onValueChange={(val) => {
            if (val) onConfigChange("colorPalette", val);
          }}
        >
          <ComboboxInput
            placeholder="Select palette..."
            className="[&_input]:!capitalize [&_input]:cursor-pointer [&_input]:caret-transparent cursor-pointer"
          />
          <ComboboxContent>
            <ComboboxList>
              {COLOR_PALETTES.map((palette) => (
                <ComboboxItem key={palette.id} value={palette.id}>
                  <div className="flex w-full items-center gap-2.5">
                    {palette.id === "auto" ? (
                      <SparkleIcon weight="duotone" className="size-4 shrink-0 text-primary" />
                    ) : palette.id === "custom" ? (
                      <PaletteIcon weight="duotone" className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <div className="flex shrink-0 -space-x-0.5">
                        {palette.colors.map((color, i) => (
                          <div
                            key={i}
                            className="size-3.5 ring-1 ring-background"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-xs font-medium capitalize">{palette.name}</span>
                  </div>
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {selectedPalette && selectedPalette.id !== "auto" && selectedPalette.id !== "custom" && selectedPalette.colors.length > 0 && (
          <div className="animate-in fade-in flex items-center gap-1.5 pt-1 duration-150">
            {selectedPalette.colors.map((color, i) => (
              <div
                key={i}
                className="size-6 ring-1 ring-border"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <span className="ml-1 text-[10px] text-muted-foreground/50">
              {selectedPalette.colors.length} colors
            </span>
          </div>
        )}

        {config.colorPalette === "custom" && (
          <div className="animate-in fade-in slide-in-from-top-1 space-y-2.5 border bg-muted/20 p-3 duration-150">
            <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Custom Colors ({config.customColors.length}/{MAX_COLORS})
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {config.customColors.map((color, i) => (
                <button
                  key={`${color}-${i}`}
                  className="group/c relative size-8 cursor-pointer ring-1 ring-border transition-all hover:ring-2 hover:ring-destructive"
                  style={{ backgroundColor: color }}
                  onClick={() =>
                    onConfigChange("customColors", config.customColors.filter((_, idx) => idx !== i))
                  }
                  title="Click to remove"
                >
                  <XIcon
                    weight="bold"
                    className="absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity group-hover/c:opacity-100"
                  />
                </button>
              ))}

              {config.customColors.length < MAX_COLORS && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="size-8 cursor-pointer border border-border bg-transparent"
                    title="Pick a color"
                  />
                  <button
                    onClick={() => onConfigChange("customColors", [...config.customColors, newColor])}
                    className="flex h-8 cursor-pointer items-center border border-dashed border-muted-foreground/30 px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </ConfigField>

      <Separator />

      <ConfigField label="Background">
        <ToggleGroup
          value={[config.background]}
          onValueChange={(val) => {
            const latest = val[val.length - 1];
            if (latest) onConfigChange("background", latest as BackgroundType);
          }}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem value="transparent" className="flex-1 text-[11px]">None</ToggleGroupItem>
          <ToggleGroupItem value="white" className="flex-1 text-[11px]">White</ToggleGroupItem>
          <ToggleGroupItem value="custom" className="flex-1 text-[11px]">Custom</ToggleGroupItem>
        </ToggleGroup>
        {config.background === "custom" && (
          <div className="animate-in fade-in flex items-center gap-2 pt-1 duration-150">
            <input
              type="color"
              value={config.customBgColor}
              onChange={(e) => onConfigChange("customBgColor", e.target.value)}
              className="size-7 cursor-pointer border border-border bg-transparent"
            />
            <span className="text-[11px] tabular-nums text-muted-foreground">{config.customBgColor}</span>
          </div>
        )}
      </ConfigField>

      <ConfigField label="Reference" tooltip="Upload an image to guide the AI's visual direction.">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onReferenceImageChange?.(e.target.files?.[0] ?? null)}
        />

        {config.referenceImage && config.referenceImagePreview ? (
          <div className="animate-in fade-in space-y-2.5 duration-200">
            <div className="relative overflow-hidden border">
              <img
                src={config.referenceImagePreview}
                alt="Reference"
                className="aspect-video w-full object-cover"
              />
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute right-1 top-1 size-6 cursor-pointer"
                onClick={() => onReferenceImageChange?.(null)}
              >
                <XIcon weight="bold" className="size-3" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Influence</Label>
                <span className="text-[11px] tabular-nums font-medium">{config.referenceStrength}%</span>
              </div>
              <Slider
                value={[config.referenceStrength]}
                onValueChange={(val) => {
                  const v = Array.isArray(val) ? val[0] : val;
                  onConfigChange("referenceStrength", v ?? 50);
                }}
                min={0}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-[9px] text-muted-foreground/40">
                <span>Subtle</span>
                <span>Strong</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group flex w-full cursor-pointer flex-col items-center gap-2 border border-dashed border-muted-foreground/20 py-5 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            <UploadIcon weight="bold" className="size-5 transition-transform group-hover:-translate-y-0.5" />
            <span className="text-[11px]">Upload reference</span>
          </button>
        )}
      </ConfigField>

      <Separator />

      <ConfigField label="Exclude" tooltip="Describe elements to avoid in your logo.">
        <Textarea
          value={config.negativePrompt}
          onChange={(e) => onConfigChange("negativePrompt", e.target.value)}
          placeholder="e.g., no text, no gradients, no 3D"
          rows={2}
          className="min-h-0 resize-none text-xs"
        />
      </ConfigField>

      <ConfigField label="Seed" tooltip="Fixed seed = identical output every time. Leave empty for random.">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={config.seed ?? ""}
            onChange={(e) => onConfigChange("seed", e.target.value ? Number(e.target.value) : null)}
            placeholder="Random"
            className="flex-1 text-xs"
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  onClick={() => onConfigChange("seed", Math.floor(Math.random() * 999999999))}
                />
              }
            >
              <DiceFiveIcon weight="bold" className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top">Randomize</TooltipContent>
          </Tooltip>
        </div>
      </ConfigField>
    </div>
  );
}
