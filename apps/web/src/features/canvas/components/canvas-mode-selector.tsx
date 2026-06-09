import React from "react";
import { useCanvasStore } from "../store/canvas-store";
import type { CanvasMode } from "../types/canvas";
import {
  PencilSimple,
  ArrowsClockwise,
  PaintBrushHousehold,
  TextT,
  ScribbleLoop,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@quicklogo/ui/components/tooltip";
import { cn } from "@quicklogo/ui/lib/utils";

const MODES: {
  id: CanvasMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "edit",
    label: "Edit",
    description: "Standard canvas editing (no AI)",
    icon: PencilSimple,
  },
  {
    id: "img2img",
    label: "Img2Img",
    description: "Transform content subtly or completely",
    icon: ArrowsClockwise,
  },
  {
    id: "inpaint",
    label: "Inpaint",
    description: "Paint a mask, AI fills the masked area",
    icon: PaintBrushHousehold,
  },
  {
    id: "text2img",
    label: "Text2Img",
    description: "Select a region, AI generates from prompt",
    icon: TextT,
  },
  {
    id: "sketch2img",
    label: "Sketch",
    description: "Draw a sketch, AI turns it into a polished image",
    icon: ScribbleLoop,
  },
];

export function CanvasModeSelector() {
  const { canvasMode, setCanvasMode, setAiStrength } = useCanvasStore();

  const handleModeChange = (modeId: CanvasMode) => {
    setCanvasMode(modeId);
    if (modeId === "sketch2img") {
      setAiStrength(30);
    } else if (modeId === "img2img") {
      setAiStrength(70);
    }
  };

  return (
    <TooltipProvider delay={300}>
      <div className="flex items-center gap-0.5">
        {MODES.map((mode) => {
          const isActive = canvasMode === mode.id;
          const Icon = mode.icon;

          return (
            <Tooltip key={mode.id}>
              <TooltipTrigger
                onClick={() => handleModeChange(mode.id)}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
              >
                <Icon size={14} weight={isActive ? "fill" : "regular"} />
                <span className="hidden sm:inline">{mode.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mode-selector-active"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold">{mode.label}</p>
                <p className="text-muted-foreground text-[10px]">{mode.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
