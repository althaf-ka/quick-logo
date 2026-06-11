import React, { useRef } from "react";
import { TooltipProvider } from "@quicklogo/ui/components/tooltip";
import {
  Cursor,
  TextT,
  PencilSimple,
  Square,
  Image as ImageIcon,
  Eraser,
  Hand,
} from "@phosphor-icons/react";
import { ToolButton } from "./tool-button";
import { useCanvasStore } from "../../store/canvas-store";

export function CanvasToolbar() {
  const { activeTool, setActiveTool, canvasMode, resetAIWorkflow } = useCanvasStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onToolClick = (tool: any) => {
    if (tool === "image") {
      fileInputRef.current?.click();
    } else {
      // Professional workflow management:
      // If the user selects a tool that is fundamentally incompatible with the active AI workflow,
      // it means they are trying to break out of the AI workflow to do manual editing.
      // We seamlessly abort the AI workflow so the UI states don't desynchronize.
      if (canvasMode === "img2img" && tool !== "select" && tool !== "hand") {
        resetAIWorkflow();
      } else if (canvasMode === "inpaint" && tool !== "eraser" && tool !== "hand") {
        resetAIWorkflow();
      } else if (canvasMode === "sketch2img" && tool !== "pencil" && tool !== "eraser" && tool !== "hand" && tool !== "select") {
        resetAIWorkflow();
      }

      setActiveTool(tool);
    }
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      window.dispatchEvent(
        new CustomEvent("canvas:add-image", { detail: { file } }),
      );
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-full w-12 shrink-0 flex-col items-center gap-2 border-r border-white/[0.06] bg-zinc-950 py-2">
        <ToolButton
          icon={Cursor}
          label="Select"
          shortcut="V"
          isActive={activeTool === "select"}
          onClick={() => onToolClick("select")}
        />

        <div className="my-1 h-px w-6 shrink-0 bg-white/[0.06]" />

        <ToolButton
          icon={TextT}
          label="Text"
          shortcut="T"
          isActive={activeTool === "text"}
          onClick={() => onToolClick("text")}
        />
        <ToolButton
          icon={PencilSimple}
          label="Pencil"
          shortcut="P"
          isActive={activeTool === "pencil"}
          onClick={() => onToolClick("pencil")}
        />
        <ToolButton
          icon={Square}
          label="Shapes"
          shortcut="S"
          isActive={activeTool === "shapes"}
          onClick={() => onToolClick("shapes")}
        />
        <ToolButton
          icon={Eraser}
          label="Eraser"
          shortcut="E"
          isActive={activeTool === "eraser"}
          onClick={() => onToolClick("eraser")}
        />

        <div className="my-1 h-px w-6 shrink-0 bg-white/[0.06]" />

        <ToolButton
          icon={ImageIcon}
          label="Image"
          shortcut="I"
          isActive={false}
          onClick={() => onToolClick("image")}
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={onImageChange}
        />

        <div className="my-1 h-px w-6 shrink-0 bg-white/[0.06]" />

        <ToolButton
          icon={Hand}
          label="Hand"
          shortcut="H"
          isActive={activeTool === "hand"}
          onClick={() => onToolClick("hand")}
        />

        <div className="flex-1" />

      </div>
    </TooltipProvider>
  );
}
