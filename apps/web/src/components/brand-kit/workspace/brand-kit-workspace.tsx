import { useState, useEffect } from "react";
import { cn } from "@quicklogo/ui/lib/utils";
import { PromptInput } from "@/components/global/prompt-input";
import { SidebarShell } from "@/components/brand-kit/workspace/sidebar/sidebar-shell";
import { BrandKitResults } from "@/components/brand-kit/results/brand-kit-results";
import { BrandQuestionnaire } from "@/components/brand-kit/setup/brand-questionnaire";
import { useBrandKit } from "@/hooks/brand-kit/use-brand-kit";
import { useClientLogoVariations } from "@/hooks/brand-kit/use-client-logo-variations";
import { getSectionLabel } from "@quicklogo/shared";
import {
  SlidersHorizontalIcon,
  SparkleIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  UploadSimpleIcon,
  TerminalIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { promptBarSlide, pageTransition } from "@/lib/motion/variants";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@quicklogo/ui/components/drawer";

interface BrandKitWorkspaceProps {
  imageId?: string;
  brandKitId?: string;
}

function getRefinementTargetContext(
  sectionId: string | null,
  targetItemId: string | null,
) {
  if (!sectionId) return undefined;
  if (sectionId === "social-media" && !targetItemId) {
    return "Social Media Kit · All Covers";
  }
  if (sectionId === "business-card" && !targetItemId) {
    return "Business Card";
  }
  return getSectionLabel(sectionId, targetItemId);
}

function getRefinementTargetDescription(
  sectionId: string | null,
  targetItemId: string | null,
) {
  if (sectionId === "social-media") {
    return targetItemId
      ? "Only this asset will change. Other social assets will remain unchanged."
      : "X, LinkedIn, Facebook, and YouTube covers will change. Your profile picture will remain unchanged.";
  }
  if (sectionId === "business-card") {
    if (!targetItemId) {
      return "Front and back will be refined as one coordinated design. Stored details, print format, and QR destination will be preserved.";
    }
    return `Only the ${targetItemId} side will change. The other side will remain unchanged, and stored card details will be preserved.`;
  }
  return undefined;
}

export function BrandKitWorkspace({
  imageId,
  brandKitId,
}: BrandKitWorkspaceProps) {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const bk = useBrandKit({ imageId, brandKitId });
  const results = useClientLogoVariations(bk.results);

  return (
    <div className="flex h-full overflow-hidden bg-zinc-950">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="scrollbar-subtle flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:px-8">
          <AnimatePresence mode="wait">
            {bk.isQueryLoading ||
            bk.isImageLoading ||
            (!!imageId && !bk.logoUrl) ? (
              <motion.div
                key="query-loading"
                variants={pageTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex h-full min-h-[60vh] w-full items-center justify-center"
              >
                <QueryLoadingState
                  text={
                    imageId
                      ? "Importing Source Logo..."
                      : "Loading Brand Kit..."
                  }
                />
              </motion.div>
            ) : bk.normalizedData?.status === "failed" && !results ? (
              <motion.div
                key="generation-failed"
                variants={pageTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex h-full min-h-[60vh] w-full items-center justify-center"
              >
                <GenerationFailedState
                  message={bk.normalizedData.errorMessage}
                />
              </motion.div>
            ) : bk.isGenerating && !results ? (
              <motion.div
                key="generating"
                variants={pageTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex w-full flex-1"
              >
                <GeneratingState
                  hasSocialMedia={bk.deliverables.socialMedia.enabled}
                  progress={bk.normalizedData?.generationProgress}
                  stage={bk.normalizedData?.generationStage}
                />
              </motion.div>
            ) : results ? (
              <motion.div
                key="results"
                variants={pageTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative w-full"
              >
                <BrandKitResults
                  data={results}
                  headerAction={
                    isCompact ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.currentTarget.blur();
                            bk.setSidebarOpen(true);
                          }}
                          className="text-muted-foreground flex items-center gap-2 border border-white/[0.06] bg-zinc-900 px-3 py-1.5 font-mono text-xs font-bold tracking-wider uppercase shadow-sm transition-colors hover:border-white/[0.1] hover:bg-zinc-800"
                        >
                          <SlidersHorizontalIcon className="size-4" /> Options &
                          Exports
                        </button>
                      </div>
                    ) : null
                  }
                  onRefine={(sectionId, targetItemId) => {
                    if (bk.refiningSectionId) return;
                    bk.setTargetSection(sectionId);
                    if (targetItemId) bk.setTargetItemId(targetItemId);
                    else bk.setTargetItemId(null);
                  }}
                  onFontChange={bk.handleFontChange}
                  onPaletteChange={bk.handlePaletteChange}
                  isSavingEdit={bk.isSavingEdit}
                  refiningSectionId={bk.refiningSectionId}
                  targetSectionId={bk.targetSection}
                  targetItemId={bk.targetItemId}
                />
              </motion.div>
            ) : bk.logoUrl ? (
              <motion.div
                key="setup"
                variants={pageTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative flex w-full flex-1 flex-col"
              >
                {isCompact ? (
                  <div className="absolute top-0 right-0 z-10 flex w-full justify-end p-4">
                    <button
                      onClick={(e) => {
                        e.currentTarget.blur();
                        bk.setSidebarOpen(true);
                      }}
                      className="text-muted-foreground flex items-center gap-2 border border-white/[0.06] bg-zinc-900 px-3 py-1.5 font-mono text-xs font-bold tracking-wider uppercase shadow-sm transition-colors hover:border-white/[0.1] hover:bg-zinc-800"
                    >
                      <SlidersHorizontalIcon className="size-4" /> Settings
                    </button>
                  </div>
                ) : null}
                <BrandQuestionnaire
                  workspaceState={bk.workspaceState}
                  setWorkspaceState={bk.setWorkspaceState}
                  brandName={bk.brandName}
                  setBrandName={bk.setBrandName}
                  deliverables={bk.deliverables}
                  setDeliverables={bk.setDeliverables}
                  typography={bk.typography}
                  setTypography={bk.setTypography}
                  onMockupUpload={bk.handleMockupUpload}
                  onGenerate={bk.handleGenerate}
                  isGenerating={bk.isGenerating}
                  totalCredits={bk.totalCredits}
                  structuredContext={bk.structuredContext}
                  updateStructuredContext={bk.updateStructuredContext}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                variants={pageTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex h-full min-h-[60vh] w-full flex-1 items-center justify-center"
              >
                <EmptyState
                  isMobile={isCompact}
                  onOpenSidebar={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    bk.setSidebarOpen(true);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {bk.targetSection ? (
            <motion.div
              variants={promptBarSlide}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="pointer-events-none absolute bottom-0 flex w-full justify-center p-4 pb-6"
            >
              <div className="pointer-events-auto w-full max-w-4xl shadow-2xl">
                <PromptInput
                  value={bk.prompt}
                  onChange={bk.setPrompt}
                  onSubmit={bk.handleGenerate}
                  isLoading={bk.isGenerating || !!bk.refiningSectionId}
                  placeholder="Describe the visual changes you want…"
                  credits={bk.totalCredits}
                  targetContext={getRefinementTargetContext(
                    bk.targetSection,
                    bk.targetItemId,
                  )}
                  targetDescription={getRefinementTargetDescription(
                    bk.targetSection,
                    bk.targetItemId,
                  )}
                  onClearTarget={() => bk.setTargetSection(null)}
                  showConfigTrigger={isCompact}
                  onConfigTrigger={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    bk.setSidebarOpen(true);
                  }}
                  configIcon={
                    <SlidersHorizontalIcon weight="bold" className="size-4" />
                  }
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!isCompact ? (
        <SidebarShell
          workspaceState={bk.workspaceState}
          logoUrl={bk.logoUrl}
          isLoadingLogo={bk.isLoadingLogo}
          onLogoUpload={bk.handleLogoUpload}
          onLogoRemove={bk.handleLogoRemove}
          isFromPlatform={bk.isFromPlatform}
          extractedColors={bk.extractedColors}
          brandKitId={bk.brandKitId ?? undefined}
          results={results}
          revisions={bk.normalizedData?.revisions}
          refiningSectionId={bk.refiningSectionId ?? null}
          onCloseRefinement={() => bk.setTargetSection(null)}
          onRestoreRevision={bk.handleRestoreFull}
          deliverables={bk.deliverables}
          totalCredits={bk.totalCredits}
          generationProgress={bk.normalizedData?.generationProgress}
          generationStage={bk.normalizedData?.generationStage}
          refundedAt={bk.normalizedData?.refundedAt}
        />
      ) : null}

      {isCompact ? (
        <Drawer open={bk.sidebarOpen} onOpenChange={bk.setSidebarOpen}>
          <DrawerContent
            className="max-h-[85vh] rounded-none px-0 pb-0"
            aria-describedby={undefined}
          >
            <DrawerHeader className="border-b border-white/[0.06] px-4 pb-2 text-left">
              <DrawerTitle className="font-mono text-sm font-black tracking-widest uppercase">
                Brand Settings
              </DrawerTitle>
              {/* Radix requires a description or aria-describedby={undefined} */}
            </DrawerHeader>
            <div className="scrollbar-subtle overflow-y-auto p-0">
              <SidebarShell
                workspaceState={bk.workspaceState}
                logoUrl={bk.logoUrl}
                isLoadingLogo={bk.isLoadingLogo}
                onLogoUpload={bk.handleLogoUpload}
                onLogoRemove={bk.handleLogoRemove}
                isFromPlatform={bk.isFromPlatform}
                extractedColors={bk.extractedColors}
                brandKitId={bk.brandKitId ?? undefined}
                results={results}
                revisions={bk.normalizedData?.revisions}
                refiningSectionId={bk.refiningSectionId ?? null}
                onCloseRefinement={() => bk.setTargetSection(null)}
                onRestoreRevision={bk.handleRestoreFull}
                deliverables={bk.deliverables}
                totalCredits={bk.totalCredits}
                generationProgress={bk.normalizedData?.generationProgress}
                generationStage={bk.normalizedData?.generationStage}
                refundedAt={bk.normalizedData?.refundedAt}
                className="h-auto max-h-none w-full overflow-visible border-none"
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </div>
  );
}

const BASE_GENERATING_STEPS = [
  "Analyzing brand identity",
  "Curating typography system",
  "Generating color palettes",
  "Drafting presentation copy",
  "Structuring brand guidelines",
  "Rendering asset mockups",
  "Finalizing brand kit",
];

function GeneratingState({
  hasSocialMedia,
  progress,
  stage,
}: {
  hasSocialMedia: boolean;
  progress?: number;
  stage?: string;
}) {
  const [step, setStep] = useState(0);

  const steps = hasSocialMedia
    ? [
        ...BASE_GENERATING_STEPS.slice(0, 3),
        "Art-directing banner concepts",
        "Reviewing campaign artwork",
        "Composing platform-safe layouts",
        ...BASE_GENERATING_STEPS.slice(3),
      ]
    : BASE_GENERATING_STEPS;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }, 2500);
    return () => window.clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col items-center justify-center gap-16 py-12">
      {/* Central icon with animated rings */}
      <div className="relative flex size-32 items-center justify-center">
        {/* Outer ring pulse */}
        <div
          className="border-primary/10 absolute inset-0 animate-ping border"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="border-primary/20 absolute inset-4 animate-ping border"
          style={{ animationDuration: "2s", animationDelay: "0.5s" }}
        />

        {/* Core */}
        <div className="bg-primary/10 ring-primary/30 relative flex size-20 items-center justify-center shadow-[0_0_40px_rgba(var(--primary),0.15)] ring-1">
          <SparkleIcon
            weight="fill"
            className="text-primary size-10 animate-pulse"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex w-full max-w-sm flex-col gap-5">
        <div className="mb-2 space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold tracking-wider uppercase">
            <span className="text-primary">{stage || "Queued"}</span>
            <span className="text-muted-foreground tabular-nums">
              {progress ?? 0}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden bg-white/[0.06]">
            <motion.div
              className="bg-primary h-full"
              animate={{ width: `${progress ?? 0}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
        {steps.map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{
              opacity: step >= i ? 1 : 0,
              x: step >= i ? 0 : -16,
            }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="flex items-center gap-4"
          >
            {step > i ? (
              <CheckCircleIcon
                weight="fill"
                className="text-primary size-5 shrink-0"
              />
            ) : step === i ? (
              <CircleDashedIcon
                weight="bold"
                className="text-primary size-5 shrink-0 animate-spin"
                style={{ animationDuration: "3s" }}
              />
            ) : (
              <div className="size-5 shrink-0 border border-white/[0.08]" />
            )}
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-mono text-sm font-medium tracking-wide uppercase",
                  step > i
                    ? "text-muted-foreground decoration-primary/30 line-through"
                    : step === i
                      ? "text-primary"
                      : "text-muted-foreground/30",
                )}
              >
                {text}
              </span>
              {step === i ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-primary/50 mt-0.5 font-mono text-[10px]"
                >
                  Processing...
                </motion.span>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Terminal-style hint */}
      <div className="text-muted-foreground/20 flex items-center gap-2">
        <TerminalIcon weight="bold" className="size-3" />
        <span className="font-mono text-[9px] tracking-wider">
          AI pipeline running • Safe to leave — processing continues in the
          background
        </span>
      </div>
    </div>
  );
}

function GenerationFailedState({ message }: { message?: string }) {
  return (
    <div className="flex max-w-md flex-col items-center gap-5 px-6 text-center">
      <div className="flex size-20 items-center justify-center bg-red-500/10 ring-1 ring-red-500/25">
        <WarningCircleIcon className="size-10 text-red-400" weight="duotone" />
      </div>
      <div>
        <p className="font-mono text-lg font-black tracking-wider text-red-300 uppercase">
          Generation Failed
        </p>
        <p className="text-muted-foreground mt-3 font-mono text-[11px] leading-relaxed">
          {message ||
            "The asset provider could not complete this brand kit after multiple retries."}
        </p>
        <p className="text-muted-foreground/60 mt-2 font-mono text-[10px]">
          Any charged generation credits are refunded automatically.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  isMobile,
  onOpenSidebar,
}: {
  isMobile?: boolean;
  onOpenSidebar?: () => void;
}) {
  return (
    <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center gap-8">
      {isMobile ? (
        <div className="absolute top-0 right-0 z-10 flex w-full justify-end p-4">
          <button
            onClick={onOpenSidebar}
            className="text-muted-foreground flex items-center gap-2 border border-white/[0.06] bg-zinc-900 px-3 py-1.5 font-mono text-xs font-bold tracking-wider uppercase shadow-sm"
          >
            <SlidersHorizontalIcon className="size-4" /> Settings
          </button>
        </div>
      ) : null}

      {/* Background gradient orb */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="bg-primary/[0.03] size-[400px] blur-[120px]" />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center gap-6 px-6 text-center">
        {/* Icon */}
        <div className="relative">
          <div className="flex size-20 items-center justify-center bg-white/[0.02] ring-1 ring-white/[0.06]">
            <UploadSimpleIcon
              weight="duotone"
              className="text-muted-foreground/20 size-9"
            />
          </div>
          {/* Corner accent */}
          <div className="bg-primary/40 absolute -top-1 -right-1 size-2" />
          <div className="bg-primary/20 absolute -bottom-1 -left-1 size-2" />
        </div>

        {/* Text */}
        <div>
          <p className="text-foreground font-mono text-lg font-black tracking-wider uppercase">
            Upload Your Logo
          </p>
          <p className="text-muted-foreground/40 mx-auto mt-3 max-w-xs font-mono text-[11px] leading-relaxed tracking-wide">
            Upload a logo in the {isMobile ? "settings panel" : "sidebar"} to
            get started, or select one from your existing projects.
          </p>
        </div>

        {/* Decorative grid dots */}
        <div className="mt-2 flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="size-1 bg-white/[0.06]" />
          ))}
        </div>

        {isMobile ? (
          <button
            onClick={onOpenSidebar}
            className="bg-primary text-primary-foreground mt-2 flex items-center gap-2 px-6 py-3 font-mono text-[11px] font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]"
          >
            <UploadSimpleIcon weight="bold" className="size-4" />
            Get Started
          </button>
        ) : null}
      </div>
    </div>
  );
}

function QueryLoadingState({
  text = "Loading Brand Kit...",
}: {
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <CircleDashedIcon className="text-muted-foreground/30 size-12 animate-spin" />
      <p className="text-muted-foreground/50 mt-6 font-mono text-[10px] font-black tracking-widest uppercase">
        {text}
      </p>
    </div>
  );
}
