import * as fabric from "fabric";
import type { CanvasMode } from "../types/canvas";

export async function compositeAIResult(
  canvas: fabric.Canvas,
  resultImageUrl: string,
  mode: CanvasMode,
  options: {
    regionBounds?: { left: number; top: number; width: number; height: number };
    artboardBounds?: { left: number; top: number; width: number; height: number };
  },
): Promise<fabric.Image> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FabricImageClass = (fabric as any).FabricImage || fabric.Image;
    
    FabricImageClass.fromURL(resultImageUrl, { crossOrigin: "anonymous" }).then(
      (img: fabric.Image) => {
        // Find existing AI region selector to remove it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const regionSelector = canvas.getObjects().find((o) => (o as any).id === "__ai_region__");

        switch (mode) {
          case "img2img":
          case "text2img": {
            if (!options.regionBounds) {
              return reject(new Error("Region bounds required for img2img/text2img"));
            }

            // Scale to fit the region
            const scaleX = options.regionBounds.width / img.width!;
            const scaleY = options.regionBounds.height / img.height!;
            
            img.set({
              left: options.regionBounds.left,
              top: options.regionBounds.top,
              scaleX,
              scaleY,
              name: mode === "img2img" ? "AI Result — Img2Img" : "AI Result — Generated",
              selectable: true,
            });

            if (regionSelector) {
               canvas.remove(regionSelector);
            }
            break;
          }

          case "inpaint": {
            if (!options.artboardBounds) {
              return reject(new Error("Artboard bounds required for inpaint"));
            }

            const scaleX = options.artboardBounds.width / img.width!;
            const scaleY = options.artboardBounds.height / img.height!;

            img.set({
              left: options.artboardBounds.left,
              top: options.artboardBounds.top,
              scaleX,
              scaleY,
              name: "AI Result — Inpaint",
              selectable: true,
            });
            break;
          }

          case "sketch2img": {
            if (!options.artboardBounds) {
              return reject(new Error("Artboard bounds required for sketch2img"));
            }

            const scaleX = options.artboardBounds.width / img.width!;
            const scaleY = options.artboardBounds.height / img.height!;

            img.set({
              left: options.artboardBounds.left,
              top: options.artboardBounds.top,
              scaleX,
              scaleY,
              name: "AI Result — Sketch",
              selectable: true,
            });
            break;
          }
        }

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        // Since we modified the canvas, fire object:added so useCanvasHistory picks it up
        // (canvas.add already fires object:added internally, so no manual fire is strictly necessary)
        resolve(img);
      }
    ).catch(reject);
  });
}
