import React from "react";
import { useCanvasStore } from "../../store/canvas-store";
import {
  TextT as TextTIcon,
  Image as ImageIcon,
  Square as SquareIcon,
  PencilSimple as PencilSimpleIcon,
  Eye as EyeIcon,
  EyeSlash as EyeSlashIcon,
  LockKey as LockKeyIcon,
  LockKeyOpen as LockKeyOpenIcon,
} from "@phosphor-icons/react";
import { cn } from "@quicklogo/ui/lib/utils";

export function LayersPanel() {
  const { layers, selectedObject } = useCanvasStore();

  const handleSelect = (id: string) => {
    window.dispatchEvent(
      new CustomEvent("canvas:select-object", { detail: { id } }),
    );
  };

  const handleToggle = (
    id: string,
    prop: "visible" | "locked",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("canvas:toggle-layer", { detail: { id, prop } }),
    );
  };

  if (layers.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-xs">
        No layers yet.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col pb-4">
      {layers.map((layer) => {
        const isSelected = selectedObject?.id === layer.id;

        let Icon = SquareIcon;
        if (layer.type === "textbox" || layer.type === "text") Icon = TextTIcon;
        else if (layer.type === "image") Icon = ImageIcon;
        else if (layer.type === "path") Icon = PencilSimpleIcon;

        return (
          <div
            key={layer.id}
            onClick={() => handleSelect(layer.id)}
            className={cn(
              "flex cursor-pointer items-center justify-between border-b border-white/[0.03] px-4 py-2 transition-colors",
              isSelected
                ? "bg-primary/10 text-primary"
                : "text-zinc-300 hover:bg-white/5",
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                size={16}
                className={isSelected ? "text-primary" : "text-zinc-500"}
              />
              <span className="max-w-[120px] truncate text-xs font-medium">
                {layer.name || layer.type}
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500">
              <button
                onClick={(e) => handleToggle(layer.id, "locked", e)}
                className="transition-colors hover:text-white"
              >
                {layer.locked ? (
                  <LockKeyIcon size={14} />
                ) : (
                  <LockKeyOpenIcon size={14} />
                )}
              </button>
              <button
                onClick={(e) => handleToggle(layer.id, "visible", e)}
                className="transition-colors hover:text-white"
              >
                {layer.visible ? (
                  <EyeIcon size={14} />
                ) : (
                  <EyeSlashIcon size={14} />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
