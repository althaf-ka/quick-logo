import { motion, AnimatePresence } from "motion/react";
import { cn } from "@quicklogo/ui/lib/utils";
import type {
  WorkspaceState,
  NormalizedBrandKit,
  DeliverablesConfig,
} from "@/types/brand-kit";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";
import { SetupSidebar } from "./setup-sidebar";
import { GeneratingSidebar } from "./generating-sidebar";
import { ResultsSidebar } from "./results-sidebar";
import { RefinementSidebar } from "./refinement-sidebar";
import { sidebarContentSwap } from "@/lib/motion/variants";
import {
  StackIcon,
  LightningIcon,
  CheckSquareIcon,
  CrosshairIcon,
} from "@phosphor-icons/react";

export interface SidebarShellProps {
  workspaceState: WorkspaceState;

  // Setup Props
  logoUrl: string | null;
  isLoadingLogo: boolean;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  isFromPlatform: boolean;
  extractedColors: string[];

  // Results Props
  brandKitId?: string;
  results?: BrandKitResultsData | null;
  revisions?: NormalizedBrandKit["revisions"];
  selectedRevisionId?: string | null;
  onSelectRevision?: (revisionId: string) => void;

  // Refinement Props
  refiningSectionId: string | null;
  onCloseRefinement: () => void;

  // Selection state
  deliverables?: DeliverablesConfig;
  totalCredits?: number;
  generationProgress?: number;
  generationStage?: string;
  refundedAt?: string;

  className?: string;
}

const SETUP_STEPS = [
  { id: "foundation", label: "Foundation", num: 1 },
  { id: "creative-direction", label: "Creative", num: 2 },
  { id: "deliverables", label: "Deliverables", num: 3 },
] as const;

type SetupStepId = (typeof SETUP_STEPS)[number]["id"];

function isSetupState(state: WorkspaceState): state is SetupStepId {
  return ["foundation", "creative-direction", "deliverables"].includes(state);
}

function getStepStatus(
  step: SetupStepId,
  current: WorkspaceState,
): "completed" | "active" | "upcoming" {
  const order: SetupStepId[] = [
    "foundation",
    "creative-direction",
    "deliverables",
  ];
  const currentIdx = order.indexOf(current as SetupStepId);
  const stepIdx = order.indexOf(step);
  if (currentIdx < 0) return "completed";
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "upcoming";
}

function getSidebarHeader(state: WorkspaceState) {
  if (isSetupState(state))
    return { icon: StackIcon, label: "Brand Setup", sub: "Configure your kit" };
  if (state === "generating")
    return {
      icon: LightningIcon,
      label: "Processing",
      sub: "AI pipeline active",
    };
  if (state === "refining")
    return {
      icon: CrosshairIcon,
      label: "Focus Mode",
      sub: "Refining asset",
    };
  return {
    icon: CheckSquareIcon,
    label: "Your Brand",
    sub: "Kit complete",
  };
}

export function SidebarShell({
  workspaceState,
  className,
  ...props
}: SidebarShellProps) {
  const header = getSidebarHeader(workspaceState);
  const HeaderIcon = header.icon;

  const renderSidebarContent = () => {
    switch (workspaceState) {
      case "foundation":
      case "creative-direction":
      case "deliverables":
      case "review":
        return <SetupSidebar workspaceState={workspaceState} {...props} />;
      case "generating":
        return (
          <GeneratingSidebar
            deliverables={props.deliverables}
            totalCredits={props.totalCredits}
            progress={props.generationProgress}
            stage={props.generationStage}
            refundedAt={props.refundedAt}
          />
        );
      case "refining":
        return <RefinementSidebar {...props} />;
      case "results":
      default:
        return <ResultsSidebar {...props} />;
    }
  };

  return (
    <motion.div
      layout
      className={cn(
        "scrollbar-subtle flex shrink-0 flex-col overflow-y-auto border-l border-white/[0.06] bg-zinc-950",
        workspaceState === "refining" ? "w-[280px]" : "w-[320px]",
        className,
      )}
    >
      {/* Sidebar Header */}
      <div className="border-b border-white/[0.06] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 ring-primary/20 flex size-8 items-center justify-center ring-1">
            <HeaderIcon weight="bold" className="text-primary size-4" />
          </div>
          <div>
            <h2 className="text-foreground font-mono text-xs font-black tracking-widest uppercase">
              {header.label}
            </h2>
            <p className="text-muted-foreground/50 font-mono text-[9px] tracking-wider uppercase">
              {header.sub}
            </p>
          </div>
        </div>
      </div>

      {/* Step Progress — only during setup */}
      {isSetupState(workspaceState) ? (
        <div className="border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-start">
            {SETUP_STEPS.map((step, idx) => {
              const status = getStepStatus(step.id, workspaceState);
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center",
                    idx < SETUP_STEPS.length - 1 ? "flex-1" : "",
                  )}
                >
                  <div className="flex w-14 shrink-0 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center font-mono text-[10px] font-black transition-all duration-300",
                        status === "completed" &&
                          "bg-primary/20 text-primary ring-primary/30 ring-1",
                        status === "active" &&
                          "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.3)]",
                        status === "upcoming" &&
                          "text-muted-foreground/40 bg-white/[0.03] ring-1 ring-white/[0.06]",
                      )}
                    >
                      {status === "completed" ? (
                        <CheckSquareIcon weight="bold" className="size-3" />
                      ) : (
                        step.num
                      )}
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[8px] tracking-widest uppercase transition-colors duration-300",
                        status === "active"
                          ? "text-primary"
                          : status === "completed"
                            ? "text-muted-foreground/70"
                            : "text-muted-foreground/30",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < SETUP_STEPS.length - 1 ? (
                    <div
                      className={cn(
                        "-mt-4 h-px flex-1 transition-colors duration-500",
                        status === "completed"
                          ? "bg-primary/40"
                          : "bg-white/[0.06]",
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="scrollbar-subtle flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={
              workspaceState === "refining"
                ? "refining"
                : workspaceState === "generating"
                  ? "generating"
                  : workspaceState === "results"
                    ? "results"
                    : "setup"
            }
            variants={sidebarContentSwap}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {renderSidebarContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
