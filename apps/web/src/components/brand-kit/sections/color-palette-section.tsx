import { useEffect, useState } from "react";
import { SectionHeader, SectionContent } from "./section-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { toast } from "@quicklogo/ui/components/sonner";
import {
  CheckIcon,
  CopyIcon,
  InfoIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import { Input } from "@quicklogo/ui/components/input";
import { cn } from "@quicklogo/ui/lib/utils";
import { brandKitPaletteSchema } from "@quicklogo/shared";

export interface PaletteColor {
  hex: string;
  role: string;
  rgb?: string;
}

interface ColorPaletteSectionProps {
  colors: PaletteColor[];
  onPaletteChange?: (colors: PaletteColor[]) => void;
  isSaving?: boolean;
}

export function ColorPaletteSection({
  colors,
  onPaletteChange,
  isSaving = false,
}: ColorPaletteSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftColors, setDraftColors] = useState(colors);

  useEffect(() => {
    if (!isEditing) setDraftColors(colors);
  }, [colors, isEditing]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${value}`);
    } catch {
      toast.error("Failed to copy to clipboard", {
        description: "Clipboard access may be denied.",
      });
    }
  };

  const updateDraft = (index: number, field: "hex" | "role", value: string) => {
    setDraftColors((current) =>
      current.map((color, colorIndex) =>
        colorIndex === index ? { ...color, [field]: value } : color,
      ),
    );
  };

  const savePalette = () => {
    const parsed = brandKitPaletteSchema.safeParse(draftColors);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid color palette");
      return;
    }
    onPaletteChange?.(parsed.data);
    setIsEditing(false);
  };

  return (
    <div>
      <SectionHeader
        title="Color Palette"
        sectionId="color-palette"
        refineLabel="Refine with AI"
        actions={
          onPaletteChange ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={isEditing ? savePalette : () => setIsEditing(true)}
              className={cn(
                "h-auto cursor-pointer gap-1.5 border px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider uppercase transition-colors active:scale-95",
                isEditing
                  ? "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30"
                  : "text-foreground/70 hover:bg-primary/10 hover:text-primary",
              )}
            >
              {isEditing ? (
                <>
                  <CheckIcon weight="bold" className="size-3" />
                  {isSaving ? "Saving…" : "Done"}
                </>
              ) : (
                <>
                  <PencilSimpleIcon weight="bold" className="size-3" />
                  Edit Palette
                </>
              )}
            </Button>
          ) : null
        }
      />
      <SectionContent sectionId="color-palette">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(isEditing ? draftColors : colors).map((color, index) => (
            <div
              key={index}
              className="group hover:border-primary/30 border transition-colors"
            >
              {isEditing ? (
                <label className="relative block aspect-[4/3] cursor-pointer overflow-hidden">
                  <span className="sr-only">Choose {color.role} color</span>
                  <input
                    type="color"
                    value={
                      /^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#000000"
                    }
                    onChange={(event) =>
                      updateDraft(
                        index,
                        "hex",
                        event.target.value.toUpperCase(),
                      )
                    }
                    className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer border-0 p-0"
                  />
                </label>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
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
              )}
              <div className="space-y-0.5 border-t px-3 py-2">
                {isEditing ? (
                  <>
                    <Input
                      value={color.role}
                      aria-label={`Role for color ${index + 1}`}
                      maxLength={40}
                      onChange={(event) =>
                        updateDraft(index, "role", event.target.value)
                      }
                      className="h-7 px-1.5 font-mono text-[9px]"
                    />
                    <Input
                      value={color.hex}
                      aria-label={`Hex value for ${color.role || `color ${index + 1}`}`}
                      maxLength={7}
                      onChange={(event) =>
                        updateDraft(
                          index,
                          "hex",
                          event.target.value.toUpperCase(),
                        )
                      }
                      className="h-7 px-1.5 font-mono text-[9px] font-bold uppercase"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground font-mono text-[9px] tracking-wider uppercase">
                      {color.role}
                    </p>
                    <p className="font-mono text-[10px] font-bold uppercase">
                      {color.hex}
                    </p>
                  </>
                )}
                {!isEditing && color.rgb ? (
                  <p className="text-muted-foreground/60 font-mono text-[9px]">
                    {color.rgb}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1.5 px-1 py-1 font-mono text-[9px] tracking-wider uppercase transition-colors focus-visible:ring-1 focus-visible:outline-none"
                />
              }
            >
              <InfoIcon aria-hidden="true" className="size-3" />
              How Palette Changes Work
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72 space-y-2 text-xs">
              <p>
                <strong>Manual:</strong> Edit exact colors and roles for free.
              </p>
              <p>
                <strong>AI:</strong> Describe a direction, spend the displayed
                refinement credits, and replace the palette with the generated
                result.
              </p>
              <p>
                Brand guidelines and future refinements use the new palette.
                Existing images stay unchanged until you refine or regenerate
                them.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </SectionContent>
    </div>
  );
}
