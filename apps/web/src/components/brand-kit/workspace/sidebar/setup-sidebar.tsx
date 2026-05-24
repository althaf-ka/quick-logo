import { useRef } from "react";
import { motion } from "motion/react";
import { Button } from "@quicklogo/ui/components/button";
import { UploadSimpleIcon, CopyIcon, CircleIcon } from "@phosphor-icons/react";
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
}

export function SetupSidebar({
  logoUrl,
  isLoadingLogo,
  onLogoUpload,
  onLogoRemove,
  isFromPlatform,
  extractedColors,
}: SetupSidebarProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const hasLogo = !!logoUrl;
  const hasColors = extractedColors.length > 0;

  const copyAllColors = () => {
    const text = extractedColors.join(", ");
    navigator.clipboard.writeText(text);
    toast.success("All colors copied to clipboard");
  };

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
            Identity Source
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
            <div className="flex aspect-square items-center justify-center bg-black/60 p-6">
              <img
                src={logoUrl}
                alt="Logo"
                className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
              />
            </div>

            {/* Reflection effect */}
            <div className="absolute right-0 bottom-0 left-0 h-1/3 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />

            {!isFromPlatform && (
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
            )}
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
          {hasColors && (
            <button
              onClick={copyAllColors}
              className="text-muted-foreground/40 hover:text-primary flex items-center gap-1 font-mono text-[9px] tracking-wider uppercase transition-colors"
            >
              <CopyIcon className="size-3" />
              Copy All
            </button>
          )}
        </div>

        {hasColors ? (
          <div className="space-y-2">
            {extractedColors.map((color, i) => (
              <Tooltip key={i}>
                <TooltipTrigger
                  render={
                    <button
                      className="group flex w-full cursor-pointer items-center gap-3 bg-white/[0.01] p-2 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.03] hover:ring-white/[0.12]"
                      onClick={() => {
                        navigator.clipboard.writeText(color);
                        toast.success(`Copied ${color}`);
                      }}
                    />
                  }
                >
                  <div
                    className="size-6 shrink-0 ring-1 ring-white/[0.1]"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground group-hover:text-foreground font-mono text-[10px] tracking-wider uppercase transition-colors">
                    {color}
                  </span>
                  <CopyIcon className="text-muted-foreground/20 ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs uppercase">
                  Click to copy
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
    </motion.div>
  );
}
