import { motion } from "motion/react";
import {
  DownloadSimpleIcon,
  ClockCounterClockwiseIcon,
  CircleIcon,
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
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8"
    >
      {/* Actions */}
      <motion.div variants={staggerItem} className="space-y-3">
        <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
          Actions
        </h3>
        <Button
          className="group relative w-full justify-start overflow-hidden rounded-none font-mono text-[11px] tracking-wider uppercase transition-colors hover:bg-white/10"
          size="lg"
          onClick={onDownloadAll}
        >
          {/* Shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
          <DownloadSimpleIcon
            weight="bold"
            className="relative z-10 mr-2 size-4"
          />
          <span className="relative z-10">Download All</span>
        </Button>
      </motion.div>

      {/* Brand DNA */}
      {(results?.brandPresentation?.tagline ||
        results?.brandPresentation?.description ||
        (results?.colorPalette && results.colorPalette.length > 0) ||
        results?.typography) && (
        <motion.div variants={staggerItem} className="space-y-3">
          <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
            Brand DNA
          </h3>
          <div className="space-y-4 border border-white/[0.06] bg-white/[0.02] p-4">
            {results?.brandPresentation?.tagline && (
              <div>
                <span className="text-muted-foreground/50 mb-1 block font-mono text-[9px] tracking-widest uppercase">
                  Tagline
                </span>
                <span className="text-foreground/80 font-mono text-xs italic">
                  "{results.brandPresentation.tagline}"
                </span>
              </div>
            )}

            {results?.brandPresentation?.description && (
              <div>
                <span className="text-muted-foreground/50 mb-1 block font-mono text-[9px] tracking-widest uppercase">
                  Core Identity
                </span>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {results.brandPresentation.description}
                </p>
              </div>
            )}

            {results?.colorPalette && results.colorPalette.length > 0 && (
              <div>
                <span className="text-muted-foreground/50 mb-2 block font-mono text-[9px] tracking-widest uppercase">
                  Color System
                </span>
                <div className="flex gap-2">
                  {results.colorPalette.map((c: any) => (
                    <div
                      key={c.hex}
                      className="size-5 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: c.hex }}
                      title={c.name || c.hex}
                    />
                  ))}
                </div>
              </div>
            )}

            {results?.typography && (
              <div>
                <span className="text-muted-foreground/50 mb-2 block font-mono text-[9px] tracking-widest uppercase">
                  Typography
                </span>
                <div className="text-foreground/80 flex flex-col gap-1 font-mono text-[10px]">
                  {results.typography.heading && (
                    <span>Heading • {results.typography.heading.family}</span>
                  )}
                  {results.typography.body && (
                    <span>Body • {results.typography.body.family}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

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
