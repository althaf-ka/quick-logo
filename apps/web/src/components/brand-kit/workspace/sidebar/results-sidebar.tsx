import { motion } from "motion/react";
import {
  FileZipIcon,
  FilePdfIcon,
  CircleDashedIcon,
  ClockCounterClockwiseIcon,
  CircleIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { getSectionLabel, type BrandKitRevisionType } from "@quicklogo/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { cn } from "@quicklogo/ui/lib/utils";
import type { NormalizedBrandKit } from "@/types/brand-kit";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";
import { useExportBrandKit } from "@/hooks/brand-kit/use-export-brand-kit";

export interface ResultsSidebarProps {
  brandKitId?: string;
  results?: BrandKitResultsData | null;
  revisions?: NormalizedBrandKit["revisions"];
  onRestoreRevision?: (sourceRevisionId: string) => void;
  refiningSectionId?: string | null;
}

function getRevisionColor(revisionType: BrandKitRevisionType) {
  switch (revisionType) {
    case "initial":
      return "text-emerald-400";
    case "refinement":
      return "text-blue-400";
    case "manual_edit":
      return "text-violet-400";
    case "section_restore":
    case "full_restore":
      return "text-amber-400";
  }
}

function getRevisionDisplayLabel(
  revision: NormalizedBrandKit["revisions"][number],
) {
  const usesCompactTargetLabel =
    revision.sectionId === "socialMedia" ||
    revision.sectionId === "social-media" ||
    revision.sectionId === "businessCard" ||
    revision.sectionId === "business-card";
  if (
    revision.revisionType === "refinement" &&
    usesCompactTargetLabel &&
    revision.sectionId &&
    revision.targetItemId
  ) {
    const targetLabel = getSectionLabel(
      revision.sectionId,
      revision.targetItemId,
    ).split(" · ")[1];

    if (targetLabel) return `${targetLabel} refined`;
  }

  return revision.label;
}

export function ResultsSidebar({
  results,
  revisions,
  onRestoreRevision,
  refiningSectionId,
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

          {results?.brandGuidelines ? (
            <button
              onClick={() => exportPdf(results)}
              disabled={isExporting}
              className={cn(
                "group relative flex w-full items-center gap-3 overflow-hidden border px-4 py-3 transition-all duration-300",
                isExporting
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
          ) : null}
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
                  &quot;{results.brandPresentation.tagline}&quot;
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
          {reversedRevisions.map((rev) => {
            const isCurrent = rev.isActive;
            const restoreDisabled =
              Boolean(refiningSectionId) || !onRestoreRevision;
            const formattedDate = new Date(rev.createdAt).toLocaleString(
              undefined,
              {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              },
            );

            return (
              <article
                key={rev.id}
                className={cn(
                  "relative border border-white/[0.06] bg-white/[0.01] px-3 py-2.5 transition-colors",
                  isCurrent
                    ? "border-l-primary bg-primary/[0.03] border-l-2"
                    : restoreDisabled
                      ? "opacity-50"
                      : "hover:border-white/[0.12] hover:bg-white/[0.025]",
                )}
              >
                {!isCurrent ? (
                  <button
                    type="button"
                    aria-label={`Restore version ${rev.revisionNumber}: ${getRevisionDisplayLabel(rev)}`}
                    disabled={restoreDisabled}
                    onClick={() => {
                      onRestoreRevision?.(rev.id);
                    }}
                    title={
                      refiningSectionId
                        ? "Wait for the active refinement to finish before restoring"
                        : `Restore version ${rev.revisionNumber}`
                    }
                    className="focus-visible:ring-ring/50 absolute inset-0 z-0 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-inset disabled:cursor-not-allowed"
                  />
                ) : null}

                <div className="pointer-events-none relative z-10 flex items-start gap-2.5">
                  <CircleIcon
                    aria-hidden="true"
                    weight="fill"
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0",
                      isCurrent
                        ? "text-primary"
                        : getRevisionColor(rev.revisionType),
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "font-mono text-[9px] font-bold tracking-wider uppercase",
                            isCurrent ? "text-primary" : "text-foreground/90",
                          )}
                        >
                          V{rev.revisionNumber}
                        </span>
                        {isCurrent ? (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider uppercase">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground/45 flex shrink-0 items-center gap-1.5">
                        {!isCurrent ? (
                          <ClockCounterClockwiseIcon
                            aria-hidden="true"
                            className="size-3"
                          />
                        ) : null}
                        <time
                          dateTime={rev.createdAt}
                          className="font-mono text-[8px] tabular-nums"
                        >
                          {formattedDate}
                        </time>
                      </div>
                    </div>

                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <p className="text-foreground/70 min-w-0 flex-1 truncate font-mono text-[9px]">
                        {getRevisionDisplayLabel(rev)}
                      </p>
                      {rev.refinementPrompt ? (
                        <span className="pointer-events-auto">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label={`View refinement prompt for version ${rev.revisionNumber}`}
                                  className="text-muted-foreground/45 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex size-5 shrink-0 cursor-help items-center justify-center border border-transparent transition-colors outline-none focus-visible:ring-1"
                                />
                              }
                            >
                              <InfoIcon aria-hidden="true" className="size-3" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              align="start"
                              className="max-w-72"
                            >
                              <span className="block font-mono text-[9px] font-bold tracking-wider uppercase opacity-70">
                                Refinement prompt
                              </span>
                              <p className="mt-1 text-xs leading-relaxed break-words">
                                {rev.refinementPrompt}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
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
