import { useCanvasStore } from "../../store/canvas-store";
import { Input } from "@quicklogo/ui/components/input";
import { Slider } from "@quicklogo/ui/components/slider";
import { FontPicker } from "../../../../components/brand-kit/font-picker";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@quicklogo/ui/components/tooltip";
import {
  AlignBottomIcon,
  AlignCenterHorizontalIcon,
  AlignCenterVerticalIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  CursorIcon,
  LockKeyIcon,
  LockKeyOpenIcon,
  TrashIcon,
} from "@phosphor-icons/react";

export function PropertiesPanel() {
  const {
    selectedObject,
    activeTool,
    brushSettings,
    setBrushSettings,
    shapeSettings,
    setShapeSettings,
    textSettings,
    setTextSettings,
  } = useCanvasStore();

  const handleUpdate = (changes: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent("canvas:update-object", { detail: changes }),
    );
  };

  const dispatchAction = (
    action: string,
    detail: Record<string, unknown> = {},
  ) => {
    window.dispatchEvent(new CustomEvent(`canvas:${action}`, { detail }));
  };

  const handleAlign = (alignment: string) => {
    window.dispatchEvent(
      new CustomEvent("canvas:align", { detail: { alignment } }),
    );
  };

  if (!selectedObject) {
    if (activeTool === "pencil" || activeTool === "eraser") {
      return (
        <div className="flex h-full flex-col">
          <div className="scrollbar-subtle flex-1 space-y-6 overflow-y-auto p-4">
            <div>
              <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
                Appearance
              </h4>
              <div className="space-y-4">
                {activeTool !== "eraser" && (
                  <div className="flex items-center justify-between">
                    <label className="text-muted-foreground text-xs">
                      Color
                    </label>
                    <input
                      type="color"
                      value={brushSettings.color}
                      onChange={(e) =>
                        setBrushSettings({ color: e.target.value })
                      }
                      className="h-6 w-12 cursor-pointer rounded-none border border-white/10 bg-transparent"
                    />
                  </div>
                )}
                <div>
                  <label className="text-muted-foreground mb-2 flex justify-between text-[10px]">
                    <span>Size</span>
                    <span>{brushSettings.width}px</span>
                  </label>
                  <Slider
                    value={[brushSettings.width]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={(val) =>
                      setBrushSettings({
                        width: Array.isArray(val) ? val[0] : val,
                      })
                    }
                  />
                </div>
                {activeTool !== "eraser" && (
                  <div>
                    <label className="text-muted-foreground mb-2 flex justify-between text-[10px]">
                      <span>Opacity</span>
                      <span>{Math.round(brushSettings.opacity * 100)}%</span>
                    </label>
                    <Slider
                      value={[Math.round(brushSettings.opacity * 100)]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(val) =>
                        setBrushSettings({
                          opacity: (Array.isArray(val) ? val[0] : val) / 100,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTool === "shapes") {
      return (
        <div className="flex h-full flex-col">
          <div className="scrollbar-subtle flex-1 space-y-6 overflow-y-auto p-4">
            <div>
              <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
                Appearance
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground text-xs">Fill</label>
                  <input
                    type="color"
                    value={
                      shapeSettings.fill === "transparent"
                        ? "#ffffff"
                        : shapeSettings.fill
                    }
                    onChange={(e) => setShapeSettings({ fill: e.target.value })}
                    className="h-6 w-12 cursor-pointer rounded-none border border-white/10 bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground text-xs">
                    Stroke
                  </label>
                  <input
                    type="color"
                    value={shapeSettings.stroke}
                    onChange={(e) =>
                      setShapeSettings({ stroke: e.target.value })
                    }
                    className="h-6 w-12 cursor-pointer rounded-none border border-white/10 bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-2 block text-[10px]">
                    Stroke Width ({shapeSettings.strokeWidth})
                  </label>
                  <Slider
                    value={[shapeSettings.strokeWidth]}
                    min={0}
                    max={50}
                    step={1}
                    onValueChange={(val) =>
                      setShapeSettings({
                        strokeWidth: Array.isArray(val) ? val[0] : val,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTool === "text") {
      return (
        <div className="flex h-full flex-col">
          <div className="scrollbar-subtle flex-1 space-y-6 overflow-y-auto p-4">
            <div>
              <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
                Typography
              </h4>
              <div className="space-y-3">
                <FontPicker
                  value={textSettings.fontFamily}
                  onValueChange={(val) => setTextSettings({ fontFamily: val })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px]">
                      Size
                    </label>
                    <Input
                      type="number"
                      value={textSettings.fontSize}
                      onChange={(e) =>
                        setTextSettings({ fontSize: Number(e.target.value) })
                      }
                      className="h-7 rounded-none border-white/10 bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px]">
                      Weight
                    </label>
                    <select
                      value={textSettings.fontWeight}
                      onChange={(e) =>
                        setTextSettings({
                          fontWeight: e.target.value as "normal" | "bold",
                        })
                      }
                      className="h-7 w-full cursor-pointer rounded-none border border-white/10 bg-zinc-900 px-2 text-xs text-white outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setTextSettings({ textAlign: "left" })}
                    className={`border border-white/10 py-1 text-xs transition-colors ${textSettings.textAlign === "left" ? "bg-primary/20 text-primary" : "cursor-pointer bg-white/5 hover:bg-white/10"}`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setTextSettings({ textAlign: "center" })}
                    className={`border border-white/10 py-1 text-xs transition-colors ${textSettings.textAlign === "center" ? "bg-primary/20 text-primary" : "cursor-pointer bg-white/5 hover:bg-white/10"}`}
                  >
                    C
                  </button>
                  <button
                    onClick={() => setTextSettings({ textAlign: "right" })}
                    className={`border border-white/10 py-1 text-xs transition-colors ${textSettings.textAlign === "right" ? "bg-primary/20 text-primary" : "cursor-pointer bg-white/5 hover:bg-white/10"}`}
                  >
                    R
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-white/10" />
            <div>
              <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
                Appearance
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground text-xs">Fill</label>
                  <input
                    type="color"
                    value={textSettings.fill}
                    onChange={(e) => setTextSettings({ fill: e.target.value })}
                    className="h-6 w-12 cursor-pointer rounded-none border border-white/10 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <CursorIcon
            weight="duotone"
            className="text-muted-foreground/15 size-10"
          />
          <p className="text-muted-foreground/40 font-mono text-[10px] font-bold tracking-wider uppercase">
            No object selected
          </p>
          <p className="text-muted-foreground/30 max-w-[200px] text-xs">
            Select an image, text, or shape to edit its properties.
          </p>
        </div>
      </div>
    );
  }

  const isText =
    selectedObject.type === "textbox" || selectedObject.type === "text";

  return (
    <div className="flex h-full flex-col">
      <div className="scrollbar-subtle flex-1 space-y-6 overflow-y-auto p-4">
        <TooltipProvider>
          <div>
            <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
              Alignment
            </h4>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => handleAlign("left")}
                    className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <AlignLeftIcon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Align Left
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => handleAlign("centerH")}
                    className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <AlignCenterHorizontalIcon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Align Center Horizontal
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => handleAlign("right")}
                    className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <AlignRightIcon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Align Right
                </TooltipContent>
              </Tooltip>
              <div className="mx-1 h-4 w-px bg-white/10" />
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => handleAlign("top")}
                    className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <AlignTopIcon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Align Top
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => handleAlign("centerV")}
                    className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <AlignCenterVerticalIcon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Align Center Vertical
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => handleAlign("bottom")}
                    className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <AlignBottomIcon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Align Bottom
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        <div className="h-px w-full bg-white/10" />
        <div>
          <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
            Opacity
          </h4>
          <div className="flex items-center gap-3">
            <Slider
              value={[Math.round((selectedObject.opacity ?? 1) * 100)]}
              min={0}
              max={100}
              step={1}
              onValueChange={(val) =>
                handleUpdate({
                  opacity: (Array.isArray(val) ? val[0] : val) / 100,
                })
              }
              className="flex-1"
            />
            <span className="w-8 text-right font-mono text-xs text-zinc-300 tabular-nums">
              {Math.round((selectedObject.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>

        <div className="h-px w-full bg-white/10" />

        <div>
          <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
            Appearance
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground text-xs">Fill</label>
              <input
                type="color"
                value={selectedObject.fill}
                onChange={(e) => handleUpdate({ fill: e.target.value })}
                className="h-6 w-12 cursor-pointer rounded-none border border-white/10 bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground text-xs">Stroke</label>
              <input
                type="color"
                value={selectedObject.stroke}
                onChange={(e) => handleUpdate({ stroke: e.target.value })}
                className="h-6 w-12 cursor-pointer rounded-none border border-white/10 bg-transparent"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-2 block text-[10px]">
                Stroke Width ({selectedObject.strokeWidth})
              </label>
              <Slider
                value={[selectedObject.strokeWidth]}
                min={0}
                max={50}
                step={1}
                onValueChange={(val) =>
                  handleUpdate({
                    strokeWidth: Array.isArray(val) ? val[0] : val,
                  })
                }
              />
            </div>
          </div>
        </div>

        {isText && (
          <>
            <div className="h-px w-full bg-white/10" />
            <div>
              <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
                Typography
              </h4>
              <div className="space-y-3">
                <FontPicker
                  value={selectedObject.fontFamily || "Inter"}
                  onValueChange={(val) => handleUpdate({ fontFamily: val })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px]">
                      Size
                    </label>
                    <Input
                      type="number"
                      value={selectedObject.fontSize}
                      onChange={(e) =>
                        handleUpdate({ fontSize: Number(e.target.value) })
                      }
                      className="h-7 rounded-none border-white/10 bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px]">
                      Weight
                    </label>
                    <select
                      value={selectedObject.fontWeight || "normal"}
                      onChange={(e) =>
                        handleUpdate({ fontWeight: e.target.value })
                      }
                      className="h-7 w-full cursor-pointer rounded-none border border-white/10 bg-zinc-900 px-2 text-xs text-white outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => handleUpdate({ textAlign: "left" })}
                    className={`border border-white/10 py-1 text-xs transition-colors ${selectedObject.textAlign === "left" ? "bg-primary/20 text-primary" : "cursor-pointer bg-white/5 hover:bg-white/10"}`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => handleUpdate({ textAlign: "center" })}
                    className={`border border-white/10 py-1 text-xs transition-colors ${selectedObject.textAlign === "center" ? "bg-primary/20 text-primary" : "cursor-pointer bg-white/5 hover:bg-white/10"}`}
                  >
                    C
                  </button>
                  <button
                    onClick={() => handleUpdate({ textAlign: "right" })}
                    className={`border border-white/10 py-1 text-xs transition-colors ${selectedObject.textAlign === "right" ? "bg-primary/20 text-primary" : "cursor-pointer bg-white/5 hover:bg-white/10"}`}
                  >
                    R
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="h-px w-full bg-white/10" />

        <div>
          <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
            Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                dispatchAction("toggle-layer", {
                  id: selectedObject.id,
                  prop: "locked",
                })
              }
              className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 py-2 text-xs transition-colors hover:bg-white/10"
            >
              {selectedObject.locked ? (
                <>
                  <LockKeyOpenIcon size={14} /> Unlock
                </>
              ) : (
                <>
                  <LockKeyIcon size={14} /> Lock
                </>
              )}
            </button>
            <button
              onClick={() => dispatchAction("duplicate-object")}
              className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 py-2 text-xs transition-colors hover:bg-white/10"
            >
              <CopyIcon size={14} /> Duplicate
            </button>
            <button
              onClick={() => dispatchAction("delete-object")}
              className="flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/10 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/20"
            >
              <TrashIcon size={14} /> Delete
            </button>
            <button
              onClick={() =>
                dispatchAction("reorder-object", {
                  id: selectedObject.id,
                  action: "front",
                })
              }
              className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 py-2 text-xs transition-colors hover:bg-white/10"
            >
              <ArrowUpIcon size={14} /> To Front
            </button>
            <button
              onClick={() =>
                dispatchAction("reorder-object", {
                  id: selectedObject.id,
                  action: "back",
                })
              }
              className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 py-2 text-xs transition-colors hover:bg-white/10"
            >
              <ArrowDownIcon size={14} /> To Back
            </button>
            {selectedObject.type === "image" && (
              <button
                onClick={() =>
                  dispatchAction("flatten-image", { id: selectedObject.id })
                }
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 col-span-2 mt-2 flex items-center justify-center gap-2 border py-2 text-xs font-bold transition-colors"
              >
                Flatten Image (Merge Down)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
