import * as fabric from "fabric";
import type { CanvasMode } from "../types/canvas";

export async function compositeAIResult(
  canvas: fabric.Canvas,
  resultImageUrl: string,
  mode: CanvasMode,
  options: {
    regionBounds?: { left: number; top: number; width: number; height: number };
    artboardBounds?: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    generationGroupId?: string;
    generatedFromObjectId?: string | null;
  },
): Promise<fabric.FabricImage> {
  return new Promise((resolve, reject) => {
    const fabricAny = fabric as Record<string, unknown>;
    const FabricImageClass = (fabricAny.FabricImage ||
      fabricAny.Image) as typeof fabric.FabricImage;

    FabricImageClass.fromURL(resultImageUrl, { crossOrigin: "anonymous" })
      .then((img: fabric.FabricImage) => {
        // Find existing AI region selector to remove it
        const regionSelector = canvas
          .getObjects()
          .find((o) => o.id === "__ai_region__");

        switch (mode) {
          case "img2img": {
            if (!options.regionBounds) {
              return reject(new Error("Region bounds required for img2img"));
            }

            // Scale to fit the region
            const scaleX = options.regionBounds.width / img.width!;
            const scaleY = options.regionBounds.height / img.height!;

            img.set({
              left: options.regionBounds.left,
              top: options.regionBounds.top,
              scaleX,
              scaleY,
              name: "AI Result — Img2Img",
              selectable: true,
              generationGroupId: options.generationGroupId,
              generatedFromObjectId: options.generatedFromObjectId,
            });

            // Remove the original targeted image since it's being upgraded/replaced
            if (options.generatedFromObjectId) {
              const originalObj = canvas
                .getObjects()
                .find((o) => o.id === options.generatedFromObjectId);
              if (originalObj) {
                canvas.remove(originalObj);
              }
            }

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
              generationGroupId: options.generationGroupId,
              generatedFromObjectId: options.generatedFromObjectId,
            });
            break;
          }

          case "sketch2img": {
            if (!options.artboardBounds) {
              return reject(
                new Error("Artboard bounds required for sketch2img"),
              );
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
              generationGroupId: options.generationGroupId,
              generatedFromObjectId: options.generatedFromObjectId,
            });

            // Remove the sketches (pencil paths) since they are now baked into the generated image
            canvas.getObjects().forEach((o) => {
              if (o.type === "path") {
                canvas.remove(o);
              }
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
      })
      .catch(reject);
  });
}
