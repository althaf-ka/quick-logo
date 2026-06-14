import * as fabric from "fabric";
import {
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  DownloadIcon,
  CornersOutIcon,
  Spinner,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@quicklogo/ui/components/dropdown-menu";
import { useCanvasStore } from "../store/canvas-store";

interface CanvasHeaderProps {
  canvas: fabric.Canvas | null;
  zoomLevel: number;
  handleZoom: (amount: number) => void;
  handleCenter: () => void;
  handleSave: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
  handleDownload: (format: "png" | "jpeg" | "svg" | "webp") => void;
}

export function CanvasHeader({
  zoomLevel,
  handleZoom,
  handleCenter,
  handleSave,
  isSaving,
  isDirty,
  handleDownload,
}: CanvasHeaderProps) {
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/50 px-3">
      {/* Left: Zoom controls & History */}
      <div className="hidden items-center gap-1.5 md:flex">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("canvas:undo"))}
          disabled={!canUndo}
          className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors disabled:opacity-50"
        >
          <ArrowCounterClockwiseIcon size={14} />
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("canvas:redo"))}
          disabled={!canRedo}
          className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors disabled:opacity-50"
        >
          <ArrowClockwiseIcon size={14} />
        </button>
        <div className="mx-2 h-3 w-px bg-white/10" />
        <button
          onClick={() => handleZoom(-0.1)}
          className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
        >
          <MagnifyingGlassMinusIcon size={14} />
        </button>
        <span className="text-muted-foreground/60 w-10 text-center font-mono text-[9px] tabular-nums">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => handleZoom(0.1)}
          className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
        >
          <MagnifyingGlassPlusIcon size={14} />
        </button>
        <button
          onClick={handleCenter}
          title="Center Artboard"
          className="text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
        >
          <CornersOutIcon size={14} />
        </button>
      </div>

      {/* Center: Empty */}
      <div className="flex flex-1 justify-start overflow-hidden md:justify-center"></div>

      {/* Right: Export + Save */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground/50 hover:text-muted-foreground hidden cursor-pointer appearance-none border border-white/[0.06] bg-transparent px-2 py-1 font-mono text-[9px] font-bold tracking-wider uppercase outline-none sm:block">
            Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border-zinc-800 text-zinc-300">
            <DropdownMenuItem onClick={() => handleDownload("png")} className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white">
              PNG (Transparent)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload("jpeg")} className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white">
              JPEG (White BG)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload("svg")} className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white">
              SVG (Vector)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => handleDownload("png")}
          className="text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 px-2 py-1 transition-colors disabled:opacity-50 sm:hidden"
        >
          <DownloadIcon size={14} />
        </button>

        {isDirty && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1 px-3 py-1 font-mono text-[9px] font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
          >
            {isSaving ? <Spinner className="h-3 w-3 animate-spin" /> : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
