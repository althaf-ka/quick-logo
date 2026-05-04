import { SectionHeader, SectionContent } from "./section-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { toast } from "@quicklogo/ui/components/sonner";
import { CopyIcon } from "@phosphor-icons/react";

export interface PaletteColor {
  hex: string;
  role: string;
  rgb?: string;
}

interface ColorPaletteSectionProps {
  colors: PaletteColor[];
  onRefine?: (sectionId: string) => void;
  isRefining?: boolean;
}

export function ColorPaletteSection({
  colors,
  onRefine,
  isRefining,
}: ColorPaletteSectionProps) {
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`Copied ${value}`);
  };

  return (
    <div>
      <SectionHeader
        title="Color Palette"
        sectionId="color-palette"
        onRefine={onRefine}
        isRefining={isRefining}
      />
      <SectionContent isRefining={isRefining}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {colors.map((color, i) => (
            <div
              key={i}
              className="group border transition-colors hover:border-primary/30"
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      className="block w-full cursor-pointer"
                      onClick={() => handleCopy(color.hex)}
                    />
                  }
                >
                  <div
                    className="aspect-[4/3] w-full transition-transform group-hover:scale-[1.02]"
                    style={{ backgroundColor: color.hex }}
                  />
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">
                  <CopyIcon weight="bold" className="mr-1 inline size-3" />
                  Click to copy
                </TooltipContent>
              </Tooltip>
              <div className="space-y-0.5 border-t px-3 py-2">
                <p className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                  {color.role}
                </p>
                <p className="font-mono text-[10px] font-bold uppercase">
                  {color.hex}
                </p>
                {color.rgb && (
                  <p className="text-muted-foreground/60 font-mono text-[9px]">
                    {color.rgb}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionContent>
    </div>
  );
}
