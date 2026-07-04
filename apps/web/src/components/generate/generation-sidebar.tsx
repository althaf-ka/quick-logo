import { useRef, useState, useMemo } from "react";
import {
  type GenerateConfig,
  type ImageCount,
  type BackgroundType,
  STYLES,
  COLOR_PALETTES,
  MAX_COLORS,
} from "@/types/generate";
import { MODELS } from "@quicklogo/ai-providers/models";
import { Label } from "@quicklogo/ui/components/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@quicklogo/ui/components/combobox";
import { ModelSelector } from "@/components/ui/model-selector/model-selector";
import { IndustryPicker } from "@/components/global/industry-picker";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@quicklogo/ui/components/toggle-group";
import { Input } from "@quicklogo/ui/components/input";
import { Textarea } from "@quicklogo/ui/components/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@quicklogo/ui/components/drawer";
import { useIsMobile } from "@quicklogo/ui/hooks/use-mobile";

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
  SparkleIcon,
  PaletteIcon,
  QuestionIcon,
  XIcon,
  UploadIcon,
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
        <Label className="text-muted-foreground/70 text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </Label>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="text-muted-foreground/40 hover:text-muted-foreground cursor-help transition-colors" />
              }
            >
              <QuestionIcon weight="fill" className="size-3" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-52 text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {children}
    </div>
  );
}

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

const GRADIENT_LIST = Object.values(STYLE_GRADIENTS);

interface GenerationSidebarProps {
  config: GenerateConfig;
  onConfigChange: <K extends keyof GenerateConfig>(
    key: K,
    value: GenerateConfig[K],
  ) => void;
  onReferenceImageChange?: (file: File | null) => void;
  className?: string;
  disabled?: boolean;
}

export function GenerationSidebar({
  config,
  onConfigChange,
  onReferenceImageChange,
  className,
  disabled,
}: GenerationSidebarProps) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newColor, setNewColor] = useState("#6366f1");
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);

  const selectedPalette = useMemo(
    () => COLOR_PALETTES.find((p) => p.id === config.colorPalette),
    [config.colorPalette],
  );
  const selectedModel = useMemo(
    () => MODELS.find((m) => m.id === config.model),
    [config.model],
  );

  const isNative = !!selectedModel?.nativeStyles;
  const currentStyles = isNative
    ? selectedModel.nativeStyles!.map((s) => ({ id: s.id, name: s.label }))
    : STYLES;
  const configKey = isNative ? "nativeStyle" : "style";
  let activeStyleId = isNative ? config.nativeStyle : config.style;
  if (activeStyleId === "NONE") activeStyleId = "";
  const activeStyle = currentStyles.find((s) => s.id === activeStyleId) || null;

  return (
    <div
      className={cn(
        "bg-background flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-l p-4",
        "[&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/60",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <h3 className="text-muted-foreground/40 text-[10px] font-bold tracking-widest uppercase">
        Configuration
      </h3>

      <ConfigField
        label="Brand Name"
        tooltip="The exact text you want to appear in the logo."
      >
        <Input
          value={config.brandName || ""}
          onChange={(e) => onConfigChange("brandName", e.target.value)}
          placeholder="e.g. Acme Corp"
          className="bg-card hover:bg-muted/30 hover:border-primary/40 focus-visible:ring-primary/50 h-8 text-xs transition-colors focus-visible:ring-1"
        />
      </ConfigField>

      <div className="sm:hidden">
        <ConfigField
          label="Industry"
          tooltip="Help the AI generate better visual concepts."
        >
          <IndustryPicker
            value={config.industry || ""}
            onChange={(val) => onConfigChange("industry", val)}
            variant="sidebar"
          />
        </ConfigField>
      </div>

      <ConfigField
        label="Model"
        tooltip="Better models cost more credits but produce higher quality."
      >
        <ModelSelector
          value={config.model}
          onChange={(val: string) => onConfigChange("model", val)}
        />
      </ConfigField>

      <ConfigField label="Style" tooltip="Visual style for your logo.">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setStyleDialogOpen(true);
            }
          }}
          onClick={() => setStyleDialogOpen(true)}
          className="group bg-card hover:bg-muted/30 hover:border-primary/40 focus-visible:ring-primary/50 flex w-full cursor-pointer items-center gap-3 border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-1"
        >
          {activeStyle ? (
            <>
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center bg-linear-to-br text-[10px] font-bold text-white transition-transform duration-150 group-hover:scale-105",
                  STYLE_GRADIENTS[activeStyle.id] ||
                    GRADIENT_LIST[
                      currentStyles.findIndex((s) => s.id === activeStyle.id) %
                        GRADIENT_LIST.length
                    ],
                )}
              >
                {activeStyle.name.charAt(0)}
              </div>
              <span className="flex-1 text-xs font-medium">
                {activeStyle.name}
              </span>
              {activeStyle.id !== "" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigChange(configKey, "");
                  }}
                  className="text-muted-foreground/50 hover:text-destructive flex size-5 shrink-0 items-center justify-center rounded transition-colors"
                >
                  <XIcon weight="bold" className="size-3" />
                </button>
              ) : null}
            </>
          ) : (
            <span className="flex-1 text-xs font-medium">Auto</span>
          )}
        </div>

        {isMobile ? (
          <Drawer
            open={styleDialogOpen}
            onOpenChange={setStyleDialogOpen}
            nested
          >
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle>Choose Style</DrawerTitle>
                <DrawerDescription>Select a visual style</DrawerDescription>
              </DrawerHeader>
              <div className="grid grid-cols-4 gap-2 overflow-y-auto px-4 py-2">
                {currentStyles.map((style, index) => {
                  const isSelected = activeStyleId === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => {
                        onConfigChange(
                          configKey as "style" | "nativeStyle",
                          style.id,
                        );
                        setStyleDialogOpen(false);
                      }}
                      className={cn(
                        "group/s flex cursor-pointer flex-col items-center gap-1.5 border p-2 transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                          : "border-border hover:border-primary/40 hover:bg-muted/30",
                      )}
                    >
                      <div
                        className={cn(
                          "flex aspect-square w-full items-center justify-center bg-linear-to-br transition-transform duration-150 group-hover/s:scale-[1.03]",
                          STYLE_GRADIENTS[style.id] ||
                            GRADIENT_LIST[index % GRADIENT_LIST.length],
                        )}
                      >
                        <span className="text-xl font-bold text-white drop-shadow-sm">
                          {style.name.charAt(0)}
                        </span>
                      </div>
                      <span className="w-full truncate text-center text-[10px] font-medium">
                        {style.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Choose Style</DialogTitle>
                <DialogDescription>Select a visual style</DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[70vh] grid-cols-4 gap-2 overflow-y-auto py-2">
                {currentStyles.map((style, index) => {
                  const isSelected = activeStyleId === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => {
                        onConfigChange(
                          configKey as "style" | "nativeStyle",
                          style.id,
                        );
                        setStyleDialogOpen(false);
                      }}
                      className={cn(
                        "group/s flex cursor-pointer flex-col items-center gap-1.5 border p-2 transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                          : "border-border hover:border-primary/40 hover:bg-muted/30",
                      )}
                    >
                      <div
                        className={cn(
                          "flex aspect-square w-full items-center justify-center bg-linear-to-br transition-transform duration-150 group-hover/s:scale-[1.03]",
                          STYLE_GRADIENTS[style.id] ||
                            GRADIENT_LIST[index % GRADIENT_LIST.length],
                        )}
                      >
                        <span className="text-xl font-bold text-white drop-shadow-sm">
                          {style.name.charAt(0)}
                        </span>
                      </div>
                      <span className="w-full truncate text-center text-[10px] font-medium">
                        {style.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </ConfigField>

      <Separator />

      <ConfigField label="Logos">
        <ToggleGroup
          value={[String(config.imageCount)]}
          onValueChange={(val) => {
            const latest = val[val.length - 1];
            if (latest)
              onConfigChange("imageCount", Number(latest) as ImageCount);
          }}
          variant="outline"
          className="w-full"
        >
          {([1, 2, 4] as const).map((n) => (
            <ToggleGroupItem
              key={n}
              value={String(n)}
              className="bg-card hover:bg-muted/30 hover:border-primary/40 focus-visible:ring-primary/50 data-[state=on]:bg-primary/10 flex-1 text-xs transition-colors focus-visible:ring-1"
            >
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ConfigField>

      <ConfigField
        label="Colors"
        tooltip="Auto lets AI choose the best palette."
      >
        <Combobox
          value={config.colorPalette}
          onValueChange={(val) => {
            if (val) onConfigChange("colorPalette", val);
          }}
        >
          <ComboboxInput
            placeholder="Select palette..."
            className="bg-card hover:bg-muted/30 hover:border-primary/40 focus-within:ring-primary/50 cursor-pointer transition-colors focus-within:ring-1 [&_input]:cursor-pointer [&_input]:capitalize! [&_input]:caret-transparent"
          />
          <ComboboxContent>
            <ComboboxList>
              {COLOR_PALETTES.map((palette) => (
                <ComboboxItem key={palette.id} value={palette.id}>
                  <div className="flex w-full items-center gap-2.5">
                    {palette.id === "auto" ? (
                      <SparkleIcon
                        weight="duotone"
                        className="text-primary size-4 shrink-0"
                      />
                    ) : palette.id === "custom" ? (
                      <PaletteIcon
                        weight="duotone"
                        className="text-muted-foreground size-4 shrink-0"
                      />
                    ) : (
                      <div className="flex shrink-0 -space-x-0.5">
                        {palette.colors.map((color, i) => (
                          <div
                            key={i}
                            className="ring-background size-3.5 ring-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-xs font-medium capitalize">
                      {palette.name}
                    </span>
                  </div>
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {selectedPalette &&
        selectedPalette.id !== "auto" &&
        selectedPalette.id !== "custom" &&
        selectedPalette.colors.length > 0 ? (
          <div className="animate-in fade-in flex items-center gap-1.5 pt-1 duration-150">
            {selectedPalette.colors.map((color, i) => (
              <div
                key={i}
                className="ring-border size-6 ring-1"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <span className="text-muted-foreground/50 ml-1 text-[10px]">
              {selectedPalette.colors.length} colors
            </span>
          </div>
        ) : null}

        {config.colorPalette === "custom" ? (
          <div className="animate-in fade-in slide-in-from-top-1 bg-muted/20 space-y-2.5 border p-3 duration-150">
            <Label className="text-muted-foreground/60 text-[10px] font-medium tracking-wider uppercase">
              Custom Colors ({config.customColors.length}/{MAX_COLORS})
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {config.customColors.map((color, i) => (
                <button
                  key={`${color}-${i}`}
                  className="group/c ring-border hover:ring-destructive relative size-8 cursor-pointer ring-1 transition-all hover:ring-2"
                  style={{ backgroundColor: color }}
                  onClick={() =>
                    onConfigChange(
                      "customColors",
                      config.customColors.filter((_, idx) => idx !== i),
                    )
                  }
                  title="Click to remove"
                >
                  <XIcon
                    weight="bold"
                    className="absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity group-hover/c:opacity-100"
                  />
                </button>
              ))}

              {config.customColors.length < MAX_COLORS ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="border-border size-8 cursor-pointer border bg-transparent"
                    title="Pick a color"
                  />
                  <button
                    onClick={() =>
                      onConfigChange("customColors", [
                        ...config.customColors,
                        newColor,
                      ])
                    }
                    className="border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary flex h-8 cursor-pointer items-center border border-dashed px-2 text-[10px] font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
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
          <ToggleGroupItem
            value="white"
            className="bg-card hover:bg-muted/30 hover:border-primary/40 focus-visible:ring-primary/50 data-[state=on]:bg-primary/10 flex-1 text-[11px] transition-colors focus-visible:ring-1"
          >
            White
          </ToggleGroupItem>
          <ToggleGroupItem
            value="black"
            className="bg-card hover:bg-muted/30 hover:border-primary/40 focus-visible:ring-primary/50 data-[state=on]:bg-primary/10 flex-1 text-[11px] transition-colors focus-visible:ring-1"
          >
            Black
          </ToggleGroupItem>
          <ToggleGroupItem
            value="custom"
            className="bg-card hover:bg-muted/30 hover:border-primary/40 focus-visible:ring-primary/50 data-[state=on]:bg-primary/10 flex-1 text-[11px] transition-colors focus-visible:ring-1"
          >
            Custom
          </ToggleGroupItem>
        </ToggleGroup>
        {config.background === "custom" ? (
          <div className="animate-in fade-in flex items-center gap-2 pt-1 duration-150">
            <input
              type="color"
              value={config.customBgColor}
              onChange={(e) => onConfigChange("customBgColor", e.target.value)}
              className="border-border size-7 cursor-pointer border bg-transparent"
            />
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {config.customBgColor}
            </span>
          </div>
        ) : null}
      </ConfigField>

      {selectedModel?.supportsReferenceImage ? (
        <ConfigField
          label="Reference"
          tooltip="Upload an image to guide the AI's visual direction."
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              onReferenceImageChange?.(e.target.files?.[0] ?? null)
            }
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
                  className="absolute top-1 right-1 size-6 cursor-pointer"
                  onClick={() => onReferenceImageChange?.(null)}
                >
                  <XIcon weight="bold" className="size-3" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/30 hover:text-primary bg-card focus-visible:ring-primary/50 flex w-full cursor-pointer flex-col items-center gap-2 border border-dashed py-5 transition-all outline-none focus-visible:ring-1"
            >
              <UploadIcon
                weight="bold"
                className="size-5 transition-transform group-hover:-translate-y-0.5"
              />
              <span className="text-[11px]">Upload reference</span>
            </button>
          )}
        </ConfigField>
      ) : null}

      <Separator />

      <ConfigField
        label="Exclude"
        tooltip="Describe elements to avoid in your logo."
      >
        <Textarea
          value={config.negativePrompt}
          onChange={(e) => onConfigChange("negativePrompt", e.target.value)}
          placeholder="e.g., no text, no gradients, no 3D"
          rows={2}
          className="bg-card hover:bg-muted/30 hover:border-primary/40 focus-visible:ring-primary/50 min-h-0 resize-none text-xs transition-colors focus-visible:ring-1"
        />
      </ConfigField>
    </div>
  );
}
