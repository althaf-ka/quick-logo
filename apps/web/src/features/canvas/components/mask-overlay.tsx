import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { useMaskBrush } from "../hooks/use-mask-brush";
import { Slider } from "@quicklogo/ui/components/slider";
import { Trash, ArrowUUpLeft, Eraser } from "@phosphor-icons/react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@quicklogo/ui/components/tooltip";

interface MaskOverlayProps {
  mainCanvas: fabric.Canvas | null;
}

export function MaskOverlay({ mainCanvas }: MaskOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maskCanvas, setMaskCanvas] = useState<fabric.Canvas | null>(null);
  const { canvasMode, activeTool, maskBrushSize, setMaskBrushSize, setMaskData, maskData } = useCanvasStore();

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      selection: false,
      preserveObjectStacking: true,
    });

    setMaskCanvas(fabricCanvas);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;
        fabricCanvas.setDimensions({ width, height });
        fabricCanvas.requestRenderAll();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      fabricCanvas.dispose();
      setMaskCanvas(null);
    };
  }, []);

  // Clear mask canvas when maskData is cleared externally (e.g., when tool is cancelled)
  useEffect(() => {
    if (!maskData && maskCanvas) {
      maskCanvas.clear();
    }
  }, [maskData, maskCanvas]);

  useMaskBrush(mainCanvas, maskCanvas);

  const handleClear = () => {
    if (!maskCanvas) return;
    maskCanvas.clear();
    setMaskData(null);
  };

  const handleUndo = () => {
    if (!maskCanvas) return;
    const objects = maskCanvas.getObjects();
    if (objects.length > 0) {
      maskCanvas.remove(objects[objects.length - 1]);
      maskCanvas.requestRenderAll();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      maskCanvas.fire("path:created" as any); // trigger re-export
    }
  };

  const isInteractive = activeTool !== "hand";
  const isVisible = canvasMode === "inpaint";

  return (
    <div className={`absolute inset-0 z-40 ${isVisible ? (isInteractive ? "pointer-events-auto" : "pointer-events-none") : "hidden"}`}>
      {/* Container for the mask canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full">
        <canvas ref={canvasRef} />
      </div>

      {/* Floating Toolbar for Mask Controls */}
      {isInteractive && isVisible && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 p-2 flex items-center gap-4 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Size</span>
            <Slider
              value={[maskBrushSize]}
              onValueChange={(val) => setMaskBrushSize(Array.isArray(val) ? val[0] : (val as number))}
              min={5}
              max={100}
              step={1}
              className="w-24"
            />
            <span className="text-xs font-mono text-zinc-500 w-6 text-right">{maskBrushSize}</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          <TooltipProvider delay={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger onClick={handleUndo} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                  <ArrowUUpLeft size={16} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-900 border-white/10 text-xs">Undo Stroke</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger onClick={handleClear} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer">
                  <Trash size={16} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-900 border-white/10 text-xs">Clear Mask</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <div className="text-[10px] text-zinc-500 px-1 border-l border-white/10 ml-1 pl-3">
            Hold <kbd className="font-mono bg-white/10 px-1 rounded text-zinc-300">Alt</kbd> to <Eraser size={12} className="inline mb-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}
