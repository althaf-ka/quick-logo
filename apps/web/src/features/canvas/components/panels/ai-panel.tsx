import { useCanvasStore } from "../../store/canvas-store";
import { useShallow } from "zustand/react/shallow";
import { Slider } from "@quicklogo/ui/components/slider";
import { ModelSelector } from "@/components/ui/model-selector/model-selector";
import { getModelsForContext } from "@quicklogo/ai-providers/models";
import { useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@quicklogo/ui/components/accordion";
import {
  ArrowUUpLeftIcon,
  ImagesIcon,
  PaintBrushIcon,
  StackIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useWorkflowReadiness } from "../../hooks/use-workflow-readiness";
import type { WorkflowDefinition } from "../../hooks/use-workflow-readiness";
import type { GenerationStatus } from "../../hooks/use-canvas-ai";
import type { ModelOption } from "@quicklogo/ai-providers/models";
import { cn } from "@quicklogo/ui/lib/utils";

const EDIT_MODELS = getModelsForContext("edit");

export interface AiPanelProps {
  isGenerating: boolean;
  generationStatus: GenerationStatus;
  handleClearRegion: () => void;
}

function getStatusText(generationStatus: GenerationStatus) {
  if (generationStatus === "exporting") return "Preparing canvas...";
  if (generationStatus === "uploading") return "Uploading to secure storage...";
  if (generationStatus === "generating") return "AI is working its magic...";
  if (generationStatus === "polling") return "Finalizing details...";
  if (generationStatus === "compositing") return "Applying changes...";
  return "Generating...";
}

const getWorkflowTheme = (id: string) => {
  switch (id) {
    case "improve-image":
      return {
        text: "text-blue-400",
        border: "border-blue-500",
        bg: "bg-blue-500/10",
        accent: "bg-blue-500",
      };
    case "replace-part":
      return {
        text: "text-pink-400",
        border: "border-pink-500",
        bg: "bg-pink-500/10",
        accent: "bg-pink-500",
      };
    default:
      return {
        text: "text-zinc-400",
        border: "border-zinc-500",
        bg: "bg-zinc-500/10",
        accent: "bg-zinc-500",
      };
  }
};

const getWorkflowIcon = (id: string, themeText: string, size: number = 24) => {
  switch (id) {
    case "improve-image":
      return <ImagesIcon size={size} weight="duotone" className={themeText} />;
    case "replace-part":
      return (
        <PaintBrushIcon size={size} weight="duotone" className={themeText} />
      );
    default:
      return <StackIcon size={size} weight="duotone" className={themeText} />;
  }
};

export function AiPanel({
  isGenerating,
  generationStatus,
  handleClearRegion,
}: AiPanelProps) {
  const {
    canvasMode,
    setCanvasMode,
    aiModel,
    setAiModel,
    aiStrength,
    setAiStrength,
    regionBounds,
    resetAIWorkflow,
    maskBrushSize,
    setMaskBrushSize,
  } = useCanvasStore(
    useShallow((s) => ({
      canvasMode: s.canvasMode,
      setCanvasMode: s.setCanvasMode,
      aiModel: s.aiModel,
      setAiModel: s.setAiModel,
      aiStrength: s.aiStrength,
      setAiStrength: s.setAiStrength,
      regionBounds: s.regionBounds,
      resetAIWorkflow: s.resetAIWorkflow,
      maskBrushSize: s.maskBrushSize,
      setMaskBrushSize: s.setMaskBrushSize,
    })),
  );

  const { workflows } = useWorkflowReadiness();

  const [clickedToolId, setClickedToolId] = useState<string | null>(null);

  const activeToolId = (() => {
    if (canvasMode === "edit") return null;
    const tool = workflows.find((w) => w.id === clickedToolId);
    if (tool && tool.internalId === canvasMode) {
      return clickedToolId;
    }
    const matchingTool = workflows.find((w) => w.internalId === canvasMode);
    return matchingTool ? matchingTool.id : null;
  })();

  const renderToolButton = (workflow: WorkflowDefinition) => {
    const isActive = activeToolId === workflow.id;
    const theme = getWorkflowTheme(workflow.id);

    // Simplify names for the grid
    let shortName = workflow.name;
    if (workflow.id === "improve-image") shortName = "Improve";
    if (workflow.id === "replace-part") shortName = "Modify";

    return (
      <button
        key={workflow.id}
        onClick={() => {
          if (isActive) {
            setClickedToolId(null);
            handleClearRegion(); // Clears canvas objects (region, sketch)
            resetAIWorkflow(); // Fully wipes store states (mode, prompt, masks, results, etc)
          } else {
            setClickedToolId(workflow.id);
            if (workflow.internalId) setCanvasMode(workflow.internalId);
          }
        }}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-none border p-4 transition-all duration-200",
          isActive
            ? `${theme.bg} ${theme.border}`
            : "border-white/[0.05] bg-zinc-950/50 hover:border-white/10 hover:bg-zinc-900/50",
        )}
      >
        <div className="transition-transform duration-300 group-hover:-translate-y-0.5">
          {getWorkflowIcon(workflow.id, theme.text)}
        </div>
        <span
          className={cn(
            "mt-1 text-center font-mono text-[10px] font-bold tracking-wider uppercase transition-colors",
            isActive ? theme.text : "text-zinc-400 group-hover:text-zinc-200",
          )}
        >
          {shortName}
        </span>
      </button>
    );
  };

  const activeWorkflow = workflows.find((w) => w.id === activeToolId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] p-4">
        <h3 className="text-muted-foreground/50 font-mono text-[10px] font-bold tracking-wider uppercase">
          AI Toolbox
        </h3>
      </div>

      <div className="scrollbar-subtle flex-1 space-y-6 overflow-y-auto p-4">
        {/* Unified Top Context Box */}
        {(() => {
          if (activeWorkflow) {
            const activeTheme = getWorkflowTheme(activeWorkflow.id);
            return (
              <div
                className={cn(
                  "relative flex flex-col gap-3 overflow-hidden rounded-none border border-white/5 bg-zinc-950/30 p-4 transition-colors duration-300",
                  activeTheme.bg,
                )}
              >
                <div
                  className={cn(
                    "absolute top-0 right-0 left-0 h-[2px]",
                    activeTheme.accent,
                  )}
                />

                <div className="mt-1 flex items-center gap-2">
                  {getWorkflowIcon(activeWorkflow.id, activeTheme.text, 16)}
                  <h4
                    className={cn(
                      "font-mono text-[11px] font-bold tracking-wider uppercase",
                      activeTheme.text,
                    )}
                  >
                    {activeWorkflow.name}
                  </h4>
                </div>

                <p className="font-mono text-[11px] leading-relaxed tracking-wide text-zinc-300">
                  {activeWorkflow.statusMessage}
                </p>

                {/* Render clear region button if region exists and mode matches */}
                {canvasMode === "img2img" && regionBounds && (
                  <div className="mt-2 flex items-center justify-between rounded-none border border-white/10 bg-zinc-900/50 px-3 py-2 font-mono text-[10px]">
                    <span className="text-zinc-400">
                      Region: {Math.round(regionBounds.width)} &times;{" "}
                      {Math.round(regionBounds.height)} px
                    </span>
                    <button
                      onClick={handleClearRegion}
                      className="tracking-wider text-zinc-400 uppercase underline underline-offset-2 transition-colors hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div className="relative flex flex-col gap-3 overflow-hidden rounded-none border border-white/5 bg-zinc-950/30 p-4 transition-colors duration-300">
                <div className="absolute top-0 right-0 left-0 h-[2px] bg-zinc-800" />

                <div className="mt-1 flex items-center gap-2">
                  <StackIcon
                    size={16}
                    weight="duotone"
                    className="text-zinc-500"
                  />
                  <h4 className="font-mono text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
                    Getting Started
                  </h4>
                </div>

                <p className="font-mono text-[11px] leading-relaxed tracking-wide text-zinc-400">
                  Select a tool from the grid below to start creating.
                </p>
              </div>
            );
          }
        })()}

        {/* Minimal 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          {workflows.map(renderToolButton)}
        </div>

        {/* Render mask tools if inpaint mode */}
        {canvasMode === "inpaint" && (
          <div className="mt-2 flex flex-col gap-4 rounded-none border border-white/10 bg-zinc-950/30 p-4">
            <h4 className="font-mono text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Mask Settings
            </h4>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] leading-none font-medium tracking-wider text-zinc-400 uppercase">
                  Brush Size
                </span>
                <span className="font-mono text-[10px] leading-none text-zinc-500">
                  {maskBrushSize}
                </span>
              </div>
              <div className="flex h-4 w-full items-center">
                <Slider
                  value={[maskBrushSize]}
                  onValueChange={(val) =>
                    setMaskBrushSize(
                      Array.isArray(val) ? val[0] : (val as number),
                    )
                  }
                  min={5}
                  max={100}
                  step={1}
                  className="[&_[data-slot=slider-range]]:rounded-none [&_[data-slot=slider-range]]:bg-violet-500 [&_[data-slot=slider-thumb]]:h-4 [&_[data-slot=slider-thumb]]:w-2 [&_[data-slot=slider-thumb]]:rounded-none [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-sm [&_[data-slot=slider-thumb]]:transition-transform [&_[data-slot=slider-thumb]]:hover:scale-110 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:rounded-none [&_[data-slot=slider-track]]:bg-white/10"
                />
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-white/10 pt-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("canvas:mask:undo"))
                  }
                  className="flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-white"
                  title="Undo Stroke"
                >
                  <ArrowUUpLeftIcon size={14} />
                  <span className="text-[10px] font-medium tracking-wider uppercase">
                    Undo
                  </span>
                </button>
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("canvas:mask:clear"))
                  }
                  className="flex items-center gap-1.5 text-red-400 transition-colors hover:text-red-300"
                  title="Clear Mask"
                >
                  <TrashIcon size={14} />
                  <span className="text-[10px] font-medium tracking-wider uppercase">
                    Clear
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section: Generation Settings */}
        <Accordion className="w-full">
          <AccordionItem
            value="advanced-settings"
            className="rounded-none border border-white/10"
          >
            <AccordionTrigger className="rounded-none border-white/10 px-3 py-3 hover:bg-white/5 hover:no-underline data-[state=open]:border-b">
              <span className="text-muted-foreground font-mono text-[10px] font-bold tracking-wider uppercase">
                Generation Settings
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 bg-zinc-950/50 p-4">
              {/* Model selector */}
              <div>
                <label className="text-muted-foreground/50 mb-2 block font-mono text-[10px] font-bold tracking-wider uppercase">
                  AI Model
                </label>
                <ModelSelector
                  variant="default"
                  models={EDIT_MODELS as unknown as ModelOption[]}
                  value={aiModel}
                  onChange={setAiModel}
                  context="edit"
                />
              </div>

              {/* Strength slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-muted-foreground/50 font-mono text-[10px] font-bold tracking-wider uppercase">
                    Input Strength
                  </label>
                  <span className="font-mono text-xs text-zinc-300 tabular-nums">
                    {aiStrength}%
                  </span>
                </div>
                <Slider
                  value={[aiStrength]}
                  onValueChange={(val) =>
                    setAiStrength(Array.isArray(val) ? val[0] : (val as number))
                  }
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              {/* Steps (Placeholder) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-muted-foreground/50 font-mono text-[10px] font-bold tracking-wider uppercase">
                    Steps (Coming Soon)
                  </label>
                  <span className="font-mono text-xs text-zinc-500 tabular-nums">
                    30
                  </span>
                </div>
                <Slider value={[30]} disabled min={10} max={50} step={1} />
              </div>

              {/* Seed (Placeholder) */}
              <div>
                <label className="text-muted-foreground/50 mb-2 block font-mono text-[10px] font-bold tracking-wider uppercase">
                  Seed (Coming Soon)
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="Random"
                  className="w-full rounded-none border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-500"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Section D: Workflow Status */}
        {isGenerating && (
          <div className="border-primary/20 bg-primary/10 rounded-none border p-4">
            <h4 className="text-primary mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
              Workflow Status
            </h4>
            <div className="flex items-center gap-3">
              <span className="border-primary/30 border-t-primary size-4 animate-spin rounded-full border-2" />
              <span className="text-primary/90 font-mono text-[10px] tracking-wider uppercase">
                {getStatusText(generationStatus)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
