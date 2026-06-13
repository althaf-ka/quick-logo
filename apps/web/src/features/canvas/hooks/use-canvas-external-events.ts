import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { generateId } from "../utils/fabric-helpers";

export function useCanvasExternalEvents(canvas: fabric.Canvas | null) {
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  useEffect(() => {
    if (!canvas) return;

    const handleAddImage = (e: Event) => {
      const file = (e as CustomEvent).detail?.file as File;
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (f) => {
        const data = f.target?.result as string;
        const fabricAny = fabric as Record<string, unknown>;
        const FabricImageClass = (fabricAny.FabricImage ||
          fabricAny.Image) as typeof fabric.FabricImage;
        FabricImageClass.fromURL(data).then((img: fabric.FabricImage) => {
          img.id = generateId();
          img.set({
            left: canvas.width ? canvas.width / 2 : 100,
            top: canvas.height ? canvas.height / 2 : 100,
            originX: "center",
            originY: "center",
          });
          img.scaleToWidth(Math.min(300, canvas.width || 300));
          canvas.add(img);
          canvas.setActiveObject(img);
          setActiveTool("select");
          canvas.requestRenderAll();
        });
      };
      reader.readAsDataURL(file);
    };

    const handlePathCreated = (e: { path?: fabric.Object }) => {
      if (e.path) {
        e.path.set({
          perPixelTargetFind: true,
          id: generateId(),
          name: "Drawing",
        });
        canvas.fire("object:added", { target: e.path });
      }
    };

    window.addEventListener("canvas:add-image", handleAddImage);
    canvas.on("path:created", handlePathCreated);

    return () => {
      window.removeEventListener("canvas:add-image", handleAddImage);
      canvas.off("path:created", handlePathCreated);
    };
  }, [canvas, setActiveTool]);
}
