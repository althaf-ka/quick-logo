import { useRef } from "react";
import { Label } from "@quicklogo/ui/components/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@quicklogo/ui/components/combobox";

import { Button } from "@quicklogo/ui/components/button";
import {
  QuestionIcon,
  CheckIcon,
  UploadIcon,
  XIcon,
  Lightning,
} from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { cn } from "@quicklogo/ui/lib/utils";
import { toast } from "@quicklogo/ui/components/sonner";

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
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label className="text-muted-foreground/70 text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </Label>
        {tooltip && (
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
        )}
      </div>
      {children}
    </div>
  );
}

const FONTS = [
  { id: "modern-sans", name: "Modern Sans-Serif", family: "Inter, sans-serif" },
  { id: "classic-serif", name: "Classic Serif", family: "Merriweather, serif" },
  {
    id: "playful-display",
    name: "Playful Display",
    family: "Comic Sans MS, cursive",
  },
  {
    id: "elegant-script",
    name: "Elegant Script",
    family: "Brush Script MT, cursive",
  },
  { id: "tech-mono", name: "Tech Mono", family: "JetBrains Mono, monospace" },
];

export interface BrandKitSidebarProps {
  typography: string;
  setTypography: (v: string) => void;
  deliverables: {
    colorPalette: boolean;
    typography: boolean;
    socialMedia: boolean;
    businessCard: boolean;
    favicon: boolean;
  };
  setDeliverables: React.Dispatch<
    React.SetStateAction<{
      colorPalette: boolean;
      typography: boolean;
      socialMedia: boolean;
      businessCard: boolean;
      favicon: boolean;
    }>
  >;
  mockupImages: File[];
  setMockupImages: React.Dispatch<React.SetStateAction<File[]>>;
  mockupPreviews: string[];
  extractedColors: string[];
  className?: string;
}

export function BrandKitSidebar({
  typography,
  setTypography,
  deliverables,
  setDeliverables,
  mockupImages,
  setMockupImages,
  mockupPreviews,
  extractedColors,
  className,
}: BrandKitSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFont = FONTS.find((f) => f.id === typography);

  return (
    <div
      className={cn(
        "bg-background flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l p-4",
        "[&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/60",
        className,
      )}
    >
      <h3 className="text-muted-foreground/40 text-[10px] font-bold tracking-widest uppercase">
        Brand Settings
      </h3>

      <ConfigField
        label="Extracted Colors"
        tooltip="Colors extracted from your logo"
      >
        {extractedColors.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {extractedColors.map((color, i) => (
              <Tooltip key={i}>
                <TooltipTrigger
                  render={
                    <button
                      className="ring-border size-8 cursor-pointer rounded-none shadow-sm ring-1 transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        navigator.clipboard.writeText(color);
                        toast.success(`Copied ${color} to clipboard`);
                      }}
                    />
                  }
                />
                <TooltipContent className="font-mono text-xs uppercase">
                  {color}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground/50 border border-dashed py-3 text-center text-xs">
            Upload logo to extract colors
          </div>
        )}
      </ConfigField>

      <ConfigField
        label="Typography"
        tooltip="Primary font family for your brand"
      >
        <Combobox
          value={typography}
          onValueChange={(val) => {
            if (val) setTypography(val);
          }}
        >
          <ComboboxInput
            placeholder="Select typography..."
            className="cursor-pointer text-xs [&_input]:cursor-pointer [&_input]:caret-transparent"
            style={{ fontFamily: selectedFont?.family }}
          />
          <ComboboxContent>
            <ComboboxList>
              {FONTS.map((font) => (
                <ComboboxItem key={font.id} value={font.id}>
                  <span
                    className="text-xs font-medium"
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </span>
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </ConfigField>

      <ConfigField
        label="Deliverables"
        tooltip="Additional assets to generate (costs extra credits)"
      >
        <div className="flex flex-col gap-2">
          <DeliverableToggle
            label="Color Palette & Usage"
            checked={deliverables.colorPalette}
            disabled
            credits={0}
          />
          <DeliverableToggle
            label="Typography System"
            checked={deliverables.typography}
            disabled
            credits={0}
          />
          <DeliverableToggle
            label="Social Media Assets"
            checked={deliverables.socialMedia}
            onChange={(v) => setDeliverables((d) => ({ ...d, socialMedia: v }))}
            credits={3}
          />
          <DeliverableToggle
            label="Business Card Mockup"
            checked={deliverables.businessCard}
            onChange={(v) =>
              setDeliverables((d) => ({ ...d, businessCard: v }))
            }
            credits={2}
          />
          <DeliverableToggle
            label="Favicon & App Icons"
            checked={deliverables.favicon}
            onChange={(v) => setDeliverables((d) => ({ ...d, favicon: v }))}
            credits={1}
          />
        </div>
      </ConfigField>

      <ConfigField
        label="Product Images"
        tooltip="Upload blank product images to place your logo on."
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              setMockupImages((prev) => [
                ...prev,
                ...Array.from(e.target.files!),
              ]);
            }
          }}
        />
        {mockupPreviews.length > 0 && (
          <div className="animate-in fade-in mb-2 grid grid-cols-2 gap-2 duration-200">
            {mockupPreviews.map((preview, idx) => (
              <div key={idx} className="relative overflow-hidden border">
                <img
                  src={preview}
                  alt={`Product Image ${idx + 1}`}
                  className="aspect-square w-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-1 right-1 size-6 cursor-pointer"
                  onClick={() => {
                    setMockupImages((prev) => prev.filter((_, i) => i !== idx));
                  }}
                >
                  <XIcon weight="bold" className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary flex w-full cursor-pointer flex-col items-center gap-2 border border-dashed py-3 transition-all"
        >
          <UploadIcon
            weight="bold"
            className="size-4 transition-transform group-hover:-translate-y-0.5"
          />
          <span className="text-[10px]">Add Image</span>
        </button>
      </ConfigField>
    </div>
  );
}

function DeliverableToggle({
  label,
  checked,
  onChange,
  disabled,
  credits,
}: {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  credits: number;
}) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-none border p-3 transition-colors",
        checked
          ? "border-primary bg-primary/5"
          : "border-border/40 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-60",
      )}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-4 items-center justify-center rounded-none border transition-colors",
            checked
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30",
          )}
        >
          {checked && <CheckIcon weight="bold" className="size-3" />}
        </div>
        <span className="font-mono text-[10px] tracking-tight uppercase">
          {label}
        </span>
      </div>
      {credits > 0 && (
        <span className="text-muted-foreground flex items-center gap-0.5 font-mono text-[9px] tracking-widest uppercase">
          <Lightning weight="fill" className="text-primary size-2.5" />+
          {credits}
        </span>
      )}
    </div>
  );
}
