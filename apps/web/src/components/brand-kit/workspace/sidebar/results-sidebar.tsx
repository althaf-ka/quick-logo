import { motion } from "motion/react";
import {
  DownloadSimpleIcon,
  ShareNetworkIcon,
  ClockCounterClockwiseIcon,
  CircleIcon,
  StackIcon,
  PaletteIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import { Button } from "@quicklogo/ui/components/button";
import { cn } from "@quicklogo/ui/lib/utils";
import type { NormalizedBrandKit } from "@/types/brand-kit";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

export interface ResultsSidebarProps {
  brandKitId?: string;
  results?: any;
  onDownloadAll?: () => void;
  revisions?: NormalizedBrandKit["revisions"];
}

function getRevisionColor(triggerType: string) {
  if (triggerType === "initial_generation") return "text-emerald-400";
  if (triggerType.startsWith("refine_")) return "text-blue-400";
  if (triggerType.startsWith("restore_")) return "text-amber-400";
  return "text-muted-foreground/50";
}

export function ResultsSidebar({
  results,
  onDownloadAll,
  revisions,
}: ResultsSidebarProps) {
  // Quick stats
  const assetCount = [
    results?.logoVariations?.length && "logos",
    results?.colorPalette?.length && "colors",
    results?.typography && "fonts",
    results?.socialMedia?.length && "social",
    results?.businessCard && "card",
    results?.favicons?.length && "icons",
    results?.brandedBackdrops && "backdrops",
    results?.brandPresentation && "deck",
  ].filter(Boolean);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8"
    >
      {/* Quick Stats */}
      <motion.div variants={staggerItem} className="space-y-3">
        <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
          Kit Summary
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-white/[0.06] bg-white/[0.02] p-3 text-center">
            <StackIcon
              weight="bold"
              className="text-primary mx-auto mb-1.5 size-4"
            />
            <span className="text-foreground block font-mono text-lg font-black tabular-nums">
              {assetCount.length}
            </span>
            <span className="text-muted-foreground/40 block font-mono text-[8px] tracking-widest uppercase">
              Assets
            </span>
          </div>
          <div className="border border-white/[0.06] bg-white/[0.02] p-3 text-center">
            <PaletteIcon
              weight="bold"
              className="text-primary mx-auto mb-1.5 size-4"
            />
            <span className="text-foreground block font-mono text-lg font-black tabular-nums">
              {results?.colorPalette?.length || 0}
            </span>
            <span className="text-muted-foreground/40 block font-mono text-[8px] tracking-widest uppercase">
              Colors
            </span>
          </div>
          <div className="border border-white/[0.06] bg-white/[0.02] p-3 text-center">
            <TextTIcon
              weight="bold"
              className="text-primary mx-auto mb-1.5 size-4"
            />
            <span className="text-foreground block font-mono text-lg font-black tabular-nums">
              2
            </span>
            <span className="text-muted-foreground/40 block font-mono text-[8px] tracking-widest uppercase">
              Fonts
            </span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div variants={staggerItem} className="space-y-3">
        <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
          Actions
        </h3>
        <div className="flex flex-col gap-2">
          <Button
            className="group relative w-full justify-start overflow-hidden rounded-none font-mono text-[11px] tracking-wider uppercase"
            size="lg"
            onClick={onDownloadAll}
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            <DownloadSimpleIcon
              weight="bold"
              className="relative z-10 mr-2 size-4"
            />
            <span className="relative z-10">Export Assets</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start rounded-none border-white/[0.08] font-mono text-[11px] tracking-wider uppercase hover:border-white/[0.15] hover:bg-white/[0.04]"
            size="lg"
          >
            <ShareNetworkIcon weight="bold" className="mr-2 size-4" />
            Share Link
          </Button>
        </div>
      </motion.div>

      {/* Version History */}
      <motion.div
        variants={staggerItem}
        className="space-y-3 border-t border-white/[0.06] pt-4"
      >
        <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
          Version History
        </h3>
        <div className="space-y-1.5">
          {revisions?.map((rev, idx) => (
            <div
              key={rev.id}
              className={cn(
                "group flex cursor-pointer items-center gap-3 border border-white/[0.06] bg-white/[0.01] p-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]",
                idx === 0 && "border-primary/20 bg-primary/[0.02]",
              )}
            >
              <div className="flex items-center gap-2">
                <CircleIcon
                  weight="fill"
                  className={cn("size-1.5", getRevisionColor(rev.triggerType))}
                />
                <ClockCounterClockwiseIcon className="text-muted-foreground/40 group-hover:text-muted-foreground size-3.5 transition-colors" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-foreground font-mono text-[10px] tracking-wider uppercase">
                  v{revisions.length - idx}
                  {idx === 0 && (
                    <span className="text-primary/60 ml-2">Current</span>
                  )}
                </span>
                <span className="text-muted-foreground/40 truncate font-mono text-[9px]">
                  {new Date(rev.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {(!revisions || revisions.length === 0) && (
            <div className="text-muted-foreground/30 border border-dashed border-white/[0.06] p-4 text-center font-mono text-[10px] tracking-wider">
              No revisions yet
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
