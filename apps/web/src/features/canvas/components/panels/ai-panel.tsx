import { useCanvasStore } from "../../store/canvas-store";
import { Slider } from "@quicklogo/ui/components/slider";
import { ModelSelector } from "@/components/ui/model-selector/model-selector";
import { getModelsForContext } from "@quicklogo/ai-providers/models";

const EDIT_MODELS = getModelsForContext("edit");
import { Sparkle, PaintBrush, Image as ImageIcon, TextT, Pencil } from "@phosphor-icons/react";
import type { GenerationStatus } from "../../hooks/use-canvas-ai";

const MODE_CONFIG = {
  inpaint: {
    icon: PaintBrush,
    label: "Inpaint",
    placeholder: "Describe what should fill the masked area...",
    description: "Brush over an area of the canvas to generate new content that blends seamlessly with the surrounding image.",
    showStrength: false,
  },
  img2img: {
    icon: ImageIcon,
    label: "Img2Img",
    placeholder: "Describe how to transform the selected region...",
    description: "Transform an existing region of the image into something new using an AI model and prompt.",
    showStrength: true,
  },
  text2img: {
    icon: TextT,
    label: "Text2Img",
    placeholder: "Describe what to generate in the selected region...",
    description: "Generate entirely new content from a text prompt in the selected area of the canvas.",
    showStrength: false,
  },
  sketch2img: {
    icon: Pencil,
    label: "Sketch2Img",
    placeholder: "Describe what your sketch represents...",
    description: "Turn your rough sketches and doodles into high-quality generated images.",
    showStrength: true,
  },
};

export type CanvasModeConfig = typeof MODE_CONFIG[keyof typeof MODE_CONFIG];

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
    aiModel,
    setAiModel,
    aiStrength,
    setAiStrength,
    maskData,
    regionBounds,
  } = useCanvasStore();

  const isEditMode = canvasMode === "edit";
  const modeConfig = !isEditMode ? MODE_CONFIG[canvasMode as keyof typeof MODE_CONFIG] : null;

  return (
    <div className="flex h-full flex-col">
      {/* Mode description + settings */}
      <div className="flex-1 overflow-y-auto scrollbar-subtle p-4 space-y-5">
        {isEditMode ? (
          // When in Edit mode, show a CTA to switch to an AI mode
          <div className="text-center py-8">
            <Sparkle
              weight="duotone"
              className="mx-auto size-10 text-muted-foreground/20 mb-3"
            />
            <p className="text-muted-foreground/50 font-mono text-[10px] font-bold tracking-wider uppercase">
              Select an AI mode to get started
            </p>
            <p className="text-muted-foreground/40 text-xs mt-2">
              Use the mode selector above to choose Img2Img, Inpaint, Text2Img, or Sketch
            </p>
          </div>
        ) : (
          <>
            {/* Mode info */}
            <div>
              <h4 className="text-muted-foreground/50 mb-2 font-mono text-[10px] font-bold tracking-wider uppercase">
                Mode: {modeConfig?.label}
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {modeConfig?.description || modeConfig?.placeholder}
              </p>
            </div>
            {/* Strength slider (only for img2img, sketch2img) */}
            {modeConfig?.showStrength && (
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
            )}
            {/* Model selector */}
            <div>
              <label className="text-muted-foreground/50 mb-2 block font-mono text-[10px] font-bold tracking-wider uppercase">
                AI Model
              </label>
              <ModelSelector
                variant="default"
                models={EDIT_MODELS as unknown as any[]}
                value={aiModel}
                onChange={setAiModel}
                context="edit"
              />
            </div>
            {/* Status indicators */}
            {canvasMode === "inpaint" && !maskData && (
              <div className="border border-yellow-500/10 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500/80">
                Paint a mask on the canvas first
              </div>
            )}
            {/* Region selection info */}
            {(canvasMode === "img2img" || canvasMode === "text2img") && (
              <div>
                <label className="text-muted-foreground/50 mb-2 block font-mono text-[10px] font-bold tracking-wider uppercase">
                  Selected Region
                </label>
                {regionBounds ? (
                  <div className="flex items-center justify-between border border-white/10 bg-zinc-900 px-3 py-2 text-xs">
                    <span className="font-mono text-zinc-300">
                      {Math.round(regionBounds.width)} &times; {Math.round(regionBounds.height)} px
                    </span>
                    <button
                      onClick={handleClearRegion}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="border border-yellow-500/10 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500/80">
                    Select a region on the canvas first
                  </div>
                )}
              </div>
            )}
            {/* Generation status */}
            {isGenerating && (
              <div className="border border-primary/10 bg-primary/5 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="border-primary/30 border-t-primary size-4 animate-spin border-2 rounded-full" />
                  <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                    {getStatusText(generationStatus)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
