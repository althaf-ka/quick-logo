import { useCanvasStore } from "../../store/canvas-store";
import { Input } from "@quicklogo/ui/components/input";
import { Slider } from "@quicklogo/ui/components/slider";
import { FontPicker } from "../../../../components/brand-kit/font-picker";
import { CANVAS_PRESETS } from "../../utils/canvas-presets";
import { Copy, Trash, ArrowUp, ArrowDown } from "@phosphor-icons/react";

export function PropertiesPanel() {
  const { selectedObject, canvasWidth, canvasHeight, setCanvasDimensions } =
    useCanvasStore();

  const handleUpdate = (changes: any) => {
    window.dispatchEvent(
      new CustomEvent("canvas:update-object", { detail: changes }),
    );
  };

  const dispatchAction = (action: string, detail: any = {}) => {
    window.dispatchEvent(new CustomEvent(`canvas:${action}`, { detail }));
  };

  if (!selectedObject) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
            Canvas Settings
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Dimensions
              </label>
              <select
                className="w-full rounded-none border border-white/10 bg-zinc-900 p-2 text-xs text-white outline-none"
                value={`${canvasWidth}x${canvasHeight}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split("x").map(Number);
                  if (w && h) setCanvasDimensions(w, h);
                }}
              >
                <option value={`${canvasWidth}x${canvasHeight}`}>
                  Custom ({canvasWidth}x{canvasHeight})
                </option>
                {CANVAS_PRESETS.map((p) => (
                  <option key={p.label} value={`${p.width}x${p.height}`}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Background Color
              </label>
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded-none border border-white/10 bg-transparent"
                onChange={(e) =>
                  dispatchAction("update-canvas", {
                    backgroundColor: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-2 block text-xs">
                Export As
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["PNG", "JPEG", "SVG", "WEBP"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() =>
                      dispatchAction("export", { format: fmt.toLowerCase() })
                    }
                    className="border border-white/10 bg-white/5 py-1.5 text-xs transition-colors hover:bg-white/10"
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isText =
    selectedObject.type === "textbox" || selectedObject.type === "text";

  return (
    <div className="space-y-6 p-4">
      <div>
        <h4 className="text-muted-foreground/50 mb-3 font-mono text-[10px] font-bold tracking-wider uppercase">
          Transform
        </h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-[10px]">
                X
              </label>
              <Input
                type="number"
                value={selectedObject.left}
                onChange={(e) => handleUpdate({ left: Number(e.target.value) })}
                className="h-7 rounded-none border-white/10 bg-zinc-900 text-xs"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-[10px]">
                Y
              </label>
              <Input
                type="number"
                value={selectedObject.top}
                onChange={(e) => handleUpdate({ top: Number(e.target.value) })}
                className="h-7 rounded-none border-white/10 bg-zinc-900 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-[10px]">
                W
              </label>
              <Input
                type="number"
                value={selectedObject.width}
                onChange={(e) =>
                  handleUpdate({
                    scaleX:
                      Number(e.target.value) / (selectedObject.width || 1),
                  })
                }
                className="h-7 rounded-none border-white/10 bg-zinc-900 text-xs"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-[10px]">
                H
              </label>
              <Input
                type="number"
                value={selectedObject.height}
                onChange={(e) =>
                  handleUpdate({
                    scaleY:
                      Number(e.target.value) / (selectedObject.height || 1),
                  })
                }
                className="h-7 rounded-none border-white/10 bg-zinc-900 text-xs"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between">
              <label className="text-muted-foreground mb-2 block text-[10px]">
                Rotation ({selectedObject.angle}°)
              </label>
            </div>
            <Slider
              value={[selectedObject.angle]}
              min={0}
              max={360}
              step={1}
              onValueChange={(val) =>
                handleUpdate({ angle: Array.isArray(val) ? val[0] : val })
              }
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label className="text-muted-foreground mb-2 block text-[10px]">
                Opacity ({selectedObject.opacity}%)
              </label>
            </div>
            <Slider
              value={[selectedObject.opacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={(val) =>
                handleUpdate({
                  opacity:
                    (Array.isArray(val) ? val[0] : (val as number)) / 100,
                })
              }
            />
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
                handleUpdate({ strokeWidth: Array.isArray(val) ? val[0] : val })
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
                    className="h-7 w-full rounded-none border border-white/10 bg-zinc-900 px-2 text-xs text-white outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => handleUpdate({ textAlign: "left" })}
                  className={`border border-white/10 py-1 text-xs transition-colors ${selectedObject.textAlign === "left" ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10"}`}
                >
                  L
                </button>
                <button
                  onClick={() => handleUpdate({ textAlign: "center" })}
                  className={`border border-white/10 py-1 text-xs transition-colors ${selectedObject.textAlign === "center" ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10"}`}
                >
                  C
                </button>
                <button
                  onClick={() => handleUpdate({ textAlign: "right" })}
                  className={`border border-white/10 py-1 text-xs transition-colors ${selectedObject.textAlign === "right" ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10"}`}
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
            onClick={() => dispatchAction("duplicate-object")}
            className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 py-2 text-xs transition-colors hover:bg-white/10"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            onClick={() => dispatchAction("delete-object")}
            className="flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/10 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/20"
          >
            <Trash size={14} /> Delete
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
            <ArrowUp size={14} /> To Front
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
            <ArrowDown size={14} /> To Back
          </button>
        </div>
      </div>
    </div>
  );
}
