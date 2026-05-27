import { useRef } from "react";
import { motion } from "motion/react";
import { Button } from "@quicklogo/ui/components/button";
import { UploadSimpleIcon, CopyIcon, CircleIcon, CheckCircleIcon, LightningIcon } from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { toast } from "@quicklogo/ui/components/sonner";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { cn } from "@quicklogo/ui/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

export interface SetupSidebarProps {
  logoUrl: string | null;
  isLoadingLogo: boolean;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  isFromPlatform: boolean;
  extractedColors: string[];
  deliverables?: import("@/types/brand-kit").DeliverablesConfig;
  totalCredits?: number;
}

export function SetupSidebar({
  logoUrl,
  isLoadingLogo,
  onLogoUpload,
  onLogoRemove,
  isFromPlatform,
  extractedColors,
  deliverables,
  totalCredits,
}: SetupSidebarProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const hasLogo = !!logoUrl;
  const hasColors = extractedColors.length > 0;

  const copyAllColors = () => {
    const text = extractedColors.join(", ");
    navigator.clipboard.writeText(text);
    toast.success("All colors copied to clipboard");
  };

  const selectedAddons = deliverables
    ? Object.entries(deliverables).filter(([, value]) => value.enabled)
    : [];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8"
    >
      {/* Logo Preview Section */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center gap-2">
          <CircleIcon
            weight="fill"
            className={cn(
              "size-1.5 transition-colors",
              hasLogo ? "text-emerald-400" : "text-amber-400",
            )}
          />
          <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
            Logo
          </h3>
        </div>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLogoUpload(file);
          }}
        />

        {isLoadingLogo ? (
          <div className="flex aspect-square items-center justify-center border border-dashed border-white/[0.06] bg-white/[0.01]">
            <Skeleton className="size-16 rounded-none" />
          </div>
        ) : logoUrl ? (
          <div className="group relative overflow-hidden ring-1 ring-white/[0.08] transition-all duration-300 hover:ring-white/[0.15]">
            <div className="flex aspect-square items-center justify-center bg-black/60 p-3">
              <img
                src={logoUrl}
                alt="Logo"
                className="max-h-full max-w-full object-contain drop-shadow-md"
              />
            </div>

            {/* Hover overlay actions */}
            {!isFromPlatform ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-none font-mono text-[10px] tracking-wider uppercase"
                  onClick={() => logoInputRef.current?.click()}
                >
                  Change
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-none font-mono text-[10px] tracking-wider uppercase"
                  onClick={onLogoRemove}
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            onClick={() => logoInputRef.current?.click()}
            className="group hover:border-primary/30 hover:bg-primary/[0.03] relative flex w-full cursor-pointer flex-col items-center gap-3 border border-dashed border-white/[0.08] py-8 transition-all duration-300"
          >
            {/* Animated dashed border overlay */}
            <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="border-primary/20 absolute inset-0 animate-pulse border border-dashed" />
            </div>

            <div className="group-hover:bg-primary/[0.05] group-hover:ring-primary/20 relative flex size-12 items-center justify-center bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-300">
              <UploadSimpleIcon
                weight="bold"
                className="text-muted-foreground/40 group-hover:text-primary size-5 transition-all duration-300 group-hover:-translate-y-0.5"
              />
            </div>
            <div className="text-center">
              <span className="text-muted-foreground/60 group-hover:text-primary block font-mono text-[10px] font-bold tracking-widest uppercase transition-colors">
                Upload Logo
              </span>
              <span className="text-muted-foreground/30 mt-1 block font-mono text-[8px] tracking-wide">
                PNG, SVG, JPG up to 10MB
              </span>
            </div>
          </button>
        )}
      </motion.div>

      {/* Extracted Colors */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleIcon
              weight="fill"
              className={cn(
                "size-1.5 transition-colors",
                hasColors ? "text-emerald-400" : "text-muted-foreground/20",
              )}
            />
            <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
              Extracted Palette
            </h3>
          </div>
          {hasColors ? (
            <button
              onClick={copyAllColors}
              className="text-muted-foreground/40 hover:text-primary flex items-center gap-1 font-mono text-[9px] tracking-wider uppercase transition-colors"
            >
              <CopyIcon className="size-3" />
              Copy All
            </button>
          ) : null}
        </div>

        {hasColors ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {extractedColors.map((color, i) => (
              <Tooltip key={i}>
                <TooltipTrigger
                  render={
                    <button
                      className="group relative cursor-pointer outline-none transition-all duration-200 hover:scale-110 hover:z-10 focus:outline-none"
                      onClick={() => {
                        navigator.clipboard.writeText(color);
                        toast.success(`Copied ${color}`);
                      }}
                    />
                  }
                >
                  <div
                    className="size-10 shrink-0 ring-1 ring-white/[0.1] shadow-sm rounded-none"
                    style={{ backgroundColor: color }}
                  />
                </TooltipTrigger>
                <TooltipContent className="font-mono text-[10px] uppercase flex items-center gap-2 border border-white/20 bg-zinc-800 text-white shadow-xl px-2.5 py-1.5">
                  <div className="size-2 shrink-0 border border-white/20 rounded-none" style={{ backgroundColor: color }} />
                  <span className="font-bold tracking-wider">{color}</span>
                  <span className="text-zinc-400 ml-1 text-[8px] lowercase">click to copy</span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/[0.06] py-4 text-center">
            <p className="text-muted-foreground/30 font-mono text-[10px] tracking-wider">
              Upload logo to extract palette
            </p>
          </div>
        )}
      </motion.div>

      {/* Order Summary */}
      {(deliverables || totalCredits !== undefined) ? (
        <motion.div variants={staggerItem} className="space-y-3">
          <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
            Order Summary
          </h3>
          <div className="space-y-4 border border-white/[0.06] bg-white/[0.02] p-4">
            {deliverables ? (
              <div>
                <span className="text-muted-foreground/50 mb-2 block font-mono text-[9px] tracking-widest uppercase">
                  Selected Add-ons
                </span>
                {selectedAddons.length > 0 ? (
                  <ul className="text-muted-foreground space-y-1.5 font-mono text-[11px]">
                    {selectedAddons.map(([key]) => {
                      const label = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase());
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <CheckCircleIcon className="size-3 text-emerald-400/70" />
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-muted-foreground/60 flex items-center gap-2 font-mono text-[10px] italic">
                    <div className="bg-muted-foreground/20 size-1 rounded-full" />
                    Base Generation Only
                  </div>
                )}
              </div>
            ) : null}

            {totalCredits !== undefined ? (
              <div className="pt-2">
                <span className="text-muted-foreground/50 mb-1 block font-mono text-[9px] tracking-widest uppercase">
                  Total Cost
                </span>
                <div className="text-foreground flex items-center gap-1.5 font-mono text-sm font-black uppercase">
                  <LightningIcon
                    weight="fill"
                    className="size-3.5 text-amber-400"
                  />
                  {totalCredits} Credits
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
