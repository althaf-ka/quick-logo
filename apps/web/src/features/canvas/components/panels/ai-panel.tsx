import { useCanvasStore } from "../../store/canvas-store";
import { Slider } from "@quicklogo/ui/components/slider";
import { ModelSelector } from "@/components/ui/model-selector/model-selector";
import { getModelsForContext } from "@quicklogo/ai-providers/models";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@quicklogo/ui/components/accordion";
import { Sparkle, PaintBrush, Image as ImageIcon, Pencil, Stack, Info } from "@phosphor-icons/react";
import type { GenerationStatus } from "../../hooks/use-canvas-ai";
import type { ModelOption } from "@quicklogo/ai-providers/models";
import type { CanvasMode } from "../../types/canvas";
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
    selectionType,
    selectedObject,
    activeTool,
    maskData,
    regionBounds,
  } = useCanvasStore();

  const handleCTA = (mode: string) => {
    setCanvasMode(mode as CanvasMode);
  };

  // Determine highlighted action based on priority
  let highlightedAction = "draw-region";
  let contextText = "No Selection";
  let contextDesc = "Select an image to unlock image editing tools.";
  const emptyStateTitle = "What would you like to do?";

  if (canvasMode === "inpaint") {
    highlightedAction = "inpaint";
    contextText = "Inpaint Mode Active";
    contextDesc = "Paint a mask to generate new content.";
  } else if (canvasMode === "sketch2img") {
    highlightedAction = "sketch";
    contextText = "Sketch Mode Active";
    contextDesc = "Transforming your sketch to an image.";
  } else if (canvasMode === "img2img") {
    if (selectedObject && selectionType === "single") {
      highlightedAction = "refine";
      contextText = "Refine Mode Active";
      contextDesc = "Refining selected image with AI.";
    } else {
      highlightedAction = "draw-region";
      contextText = "Region Mode Active";
      contextDesc = "Draw a region to generate content.";
    }
  } else if (selectionType === "multi") {
    highlightedAction = "blend";
    contextText = "Multiple Objects Selected";
    contextDesc = "Blend Layers is currently unavailable.";
  } else if (selectionType === "single" && selectedObject) {
    if (selectedObject.type === "textbox" || selectedObject.type === "text") {
      highlightedAction = "none";
      contextText = "Text Selected";
      contextDesc = "Text AI Tools are coming soon.";
    } else {
      highlightedAction = "refine";
      contextText = "Selected Image";
      contextDesc = "Refine the selected image with AI.";
    }
  } else if (activeTool === "brush") {
    highlightedAction = "inpaint";
    contextText = "Brush Tool Active";
    contextDesc = "Use the brush tool to paint a mask, then generate.";
  } else if (activeTool === "pencil") {
    highlightedAction = "sketch";
    contextText = "Pencil Tool Active";
    contextDesc = "Polish your rough sketch into a high-quality image.";
  }

  const renderAction = (
    id: string,
    icon: React.ReactNode,
    label: string,
    mode: string | null,
    disabled = false
  ) => {
    const isHighlighted = highlightedAction === id;
    return (
      <button
        key={id}
        disabled={disabled || isGenerating}
        onClick={() => mode && handleCTA(mode)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs font-medium transition-colors border rounded-none",
          isHighlighted
            ? "bg-primary/20 text-primary border-primary/30"
            : disabled
            ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
            : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border-white/10"
        )}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="font-mono text-[10px] font-bold tracking-wider uppercase text-muted-foreground/50">AI Workflow</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-subtle p-4 space-y-6">
        
        {/* Section B: Context (placed at top to guide the user) */}
        <div className="bg-white/[0.02] border border-white/10 p-3 rounded-none">
          <div className="flex items-center gap-2 mb-1.5">
            <Info size={14} className="text-primary/70" weight="duotone" />
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-white/80">
              {highlightedAction === "draw-region" ? emptyStateTitle : contextText}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/60 leading-relaxed pl-5">
            {contextDesc}
          </p>
        </div>

        {/* Section A: AI Actions */}
        <div>
          <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
            AI Actions
          </h4>
          <div className="flex flex-col gap-2">
            {renderAction("refine", <ImageIcon size={16} />, "Refine Image", "img2img")}
            {renderAction("inpaint", <PaintBrush size={16} />, "Inpaint Region", "inpaint")}
            {renderAction("sketch", <Pencil size={16} />, "Sketch to Image", "sketch2img")}
            {renderAction("draw-region", <Sparkle size={16} />, "Draw AI Region", "img2img")}
            {renderAction("blend", <Stack size={16} />, "Blend Layers (Coming Soon)", null, true)}
          </div>
        </div>

        {/* Status Indicators for selected modes */}
        {(canvasMode === "inpaint" || canvasMode === "img2img" || canvasMode === "sketch2img") && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
               <h4 className="text-primary font-mono text-[10px] font-bold tracking-wider uppercase">
                 Active Workflow: {canvasMode}
               </h4>
               <button
                 onClick={() => handleCTA("edit")}
                 className="text-xs text-red-400 hover:text-red-300 transition-colors underline underline-offset-2"
               >
                 Cancel
               </button>
            </div>

            {canvasMode === "inpaint" && !maskData && (
              <div className="border border-yellow-500/10 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500/80 rounded-none mt-2">
                Paint a mask on the canvas first
              </div>
            )}
            
            {canvasMode === "img2img" && (
              <div className="mt-2">
                {regionBounds ? (
                  <div className="flex items-center justify-between border border-white/10 bg-zinc-900 px-3 py-2 text-xs rounded-none">
                    <span className="font-mono text-zinc-300">
                      Region: {Math.round(regionBounds.width)} &times; {Math.round(regionBounds.height)} px
                    </span>
                    <button
                      onClick={handleClearRegion}
                      className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="border border-yellow-500/10 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500/80 rounded-none">
                    Select a region on the canvas first
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section C: Advanced Settings */}
        <Accordion className="w-full">
          <AccordionItem value="advanced-settings" className="border-white/10 border rounded-none">
            <AccordionTrigger className="px-3 hover:bg-white/5 py-3 hover:no-underline rounded-none data-[state=open]:border-b border-white/10">
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                Advanced Settings
              </span>
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-5 bg-zinc-950/50">
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
                <div className="flex items-center justify-between mb-2">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-muted-foreground/50 font-mono text-[10px] font-bold tracking-wider uppercase">
                    Steps (Coming Soon)
                  </label>
                  <span className="font-mono text-xs text-zinc-500 tabular-nums">
                    30
                  </span>
                </div>
                <Slider
                  value={[30]}
                  disabled
                  min={10}
                  max={50}
                  step={1}
                />
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
                  className="w-full bg-zinc-900 border border-white/10 rounded-none px-3 py-2 text-xs text-zinc-500" 
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Section D: Workflow Status */}
        {isGenerating && (
          <div className="border border-primary/20 bg-primary/10 p-4 rounded-none">
            <h4 className="text-primary mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
              Workflow Status
            </h4>
            <div className="flex items-center gap-3">
              <span className="border-primary/30 border-t-primary size-4 animate-spin border-2 rounded-full" />
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
