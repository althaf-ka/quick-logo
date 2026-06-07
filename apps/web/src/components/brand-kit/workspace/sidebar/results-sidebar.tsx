import { motion } from "motion/react";
import {
  FileZipIcon,
  FilePdfIcon,
  CircleDashedIcon,
  ClockCounterClockwiseIcon,
  CircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";
import type { NormalizedBrandKit } from "@/types/brand-kit";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";
import { useExportBrandKit } from "@/hooks/brand-kit/use-export-brand-kit";

export interface ResultsSidebarProps {
  brandKitId?: string;
  results?: BrandKitResultsData | null;
  onDownloadAll?: () => void;
  revisions?: NormalizedBrandKit["revisions"];
  onRestoreRevision?: (sourceRevisionId: string) => void;
}

function getRevisionColor(triggerType: string) {
  if (triggerType === "initial_generation") return "text-emerald-400";
  if (triggerType.startsWith("refine_")) return "text-blue-400";
  if (triggerType.startsWith("restore_")) return "text-amber-400";
  return "text-muted-foreground/50";
}

export function ResultsSidebar({
  results,
  revisions,
  onRestoreRevision,
}: ResultsSidebarProps) {
  const reversedRevisions = [...(revisions || [])].reverse();
  const { isExporting, exportType, exportZip, exportPdf } = useExportBrandKit();

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
        <div className="flex flex-col gap-2">
          <button
            onClick={() => results && exportZip(results)}
            disabled={isExporting || !results}
            className={cn(
              "group relative flex w-full items-center gap-3 overflow-hidden border px-4 py-3 transition-all duration-300",
              isExporting || !results
                ? "cursor-not-allowed border-white/[0.06] bg-white/[0.01] opacity-50"
                : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]",
            )}
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
              {isExporting && exportType === "zip" ? (
                <CircleDashedIcon
                  weight="bold"
                  className="size-4 animate-spin"
                />
              ) : (
                <FileZipIcon weight="bold" className="size-4" />
              )}
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-foreground font-mono text-[11px] font-bold tracking-widest uppercase">
                {isExporting && exportType === "zip"
                  ? "Generating ZIP..."
                  : "Download ZIP"}
              </span>
              <span className="text-muted-foreground/50 font-mono text-[9px] tracking-wider uppercase">
                All high-res assets
              </span>
            </div>
          </button>

          <button
            onClick={() => results && exportPdf(results)}
            disabled={isExporting || !results}
            className={cn(
              "group relative flex w-full items-center gap-3 overflow-hidden border px-4 py-3 transition-all duration-300",
              isExporting || !results
                ? "cursor-not-allowed border-white/[0.06] bg-white/[0.01] opacity-50"
                : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]",
            )}
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
              {isExporting && exportType === "pdf" ? (
                <CircleDashedIcon
                  weight="bold"
                  className="size-4 animate-spin"
                />
              ) : (
                <FilePdfIcon weight="bold" className="size-4" />
              )}
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-foreground font-mono text-[11px] font-bold tracking-widest uppercase">
                {isExporting && exportType === "pdf"
                  ? "Generating PDF..."
                  : "Brand Guidelines"}
              </span>
              <span className="text-muted-foreground/50 font-mono text-[9px] tracking-wider uppercase">
                PDF documentation
              </span>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Brand DNA */}
      {results?.brandPresentation?.tagline ||
      results?.brandPresentation?.description ||
      (results?.colorPalette && results.colorPalette.length > 0) ||
      results?.typography ? (
        <motion.div variants={staggerItem} className="space-y-3">
          <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
            Brand DNA
          </h3>
          <div className="space-y-4 border border-white/[0.06] bg-white/[0.02] p-4">
            {results?.brandPresentation?.tagline ? (
              <div>
                <span className="text-muted-foreground/50 mb-1 block font-mono text-[9px] tracking-widest uppercase">
                  Tagline
                </span>
                <span className="text-foreground/80 font-mono text-xs italic">
                  "{results.brandPresentation.tagline}"
                </span>
              </div>
            ) : null}

            {results?.brandPresentation?.description ? (
              <div>
                <span className="text-muted-foreground/50 mb-1 block font-mono text-[9px] tracking-widest uppercase">
                  Core Identity
                </span>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {results.brandPresentation.description}
                </p>
              </div>
            ) : null}

            {results?.colorPalette && results.colorPalette.length > 0 ? (
              <div>
                <span className="text-muted-foreground/50 mb-2 block font-mono text-[9px] tracking-widest uppercase">
                  Color System
                </span>
                <div className="flex gap-2">
                  {results.colorPalette.map(
                    (c: { hex: string; name?: string; role?: string }) => (
                      <div
                        key={c.hex}
                        className="size-5 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: c.hex }}
                        title={c.name || c.hex}
                      />
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {results?.typography ? (
              <div>
                <span className="text-muted-foreground/50 mb-2 block font-mono text-[9px] tracking-widest uppercase">
                  Typography
                </span>
                <div className="text-foreground/80 flex flex-col gap-1 font-mono text-[10px]">
                  {results.typography.heading ? (
                    <span>Heading • {results.typography.heading.family}</span>
                  ) : null}
                  {results.typography.body ? (
                    <span>Body • {results.typography.body.family}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}

      {/* Version History */}
      <motion.div
        variants={staggerItem}
        className="space-y-3 border-t border-white/[0.06] pt-4"
      >
        <h3 className="text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase">
          Version History
        </h3>
        <div className="space-y-1.5">
          {reversedRevisions.map((rev, idx) => {
            const isCurrent = rev.isActive;
            return (
              <div
                key={rev.id}
                onClick={() => {
                  if (!isCurrent && onRestoreRevision) {
                    onRestoreRevision(rev.id);
                  }
                }}
                className={cn(
                  "group relative flex items-center gap-2.5 border px-2.5 py-2 transition-all duration-300",
                  isCurrent
                    ? "border-primary/30 bg-primary/[0.03] cursor-default shadow-[inset_2px_0_0_rgba(var(--primary),0.5)]"
                    : "cursor-pointer border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <CircleIcon
                    weight="fill"
                    className={cn(
                      "size-1.5 transition-colors",
                      isCurrent
                        ? "text-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                        : getRevisionColor(rev.triggerType),
                    )}
                  />
                  <ClockCounterClockwiseIcon
                    className={cn(
                      "size-3 transition-colors",
                      isCurrent
                        ? "text-primary/50"
                        : "text-muted-foreground/30 group-hover:text-muted-foreground",
                    )}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-px">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "font-mono text-[9px] font-bold tracking-wider uppercase transition-colors",
                        isCurrent ? "text-primary" : "text-foreground/90",
                      )}
                    >
                      V{reversedRevisions.length - idx}
                    </span>
                    {isCurrent ? (
                      <span className="bg-primary/15 text-primary rounded-[2px] px-1 py-[1px] font-mono text-[7px] font-black tracking-widest uppercase">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "truncate font-mono text-[8px] transition-colors",
                      isCurrent
                        ? "text-primary/60"
                        : "text-muted-foreground/50",
                    )}
                  >
                    {new Date(rev.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          {reversedRevisions.length === 0 ? (
            <div className="text-muted-foreground/30 border border-dashed border-white/[0.06] p-4 text-center font-mono text-[10px] tracking-wider">
              No revisions yet
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
