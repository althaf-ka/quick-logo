import * as fabric from "fabric";
import type { CanvasMode } from "../types/canvas";
import { FABRIC_CUSTOM_PROPERTIES } from "./fabric-properties";

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
        // Validate that the loaded image has real dimensions
        if (!img.width || !img.height || img.width <= 0 || img.height <= 0) {
          return reject(
            new Error(
              "AI result image has invalid dimensions — the image may have failed to load",
            ),
          );
        }

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
            const scaleX = options.regionBounds.width / img.width;
            const scaleY = options.regionBounds.height / img.height;

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
                const propsToCopy: Record<string, unknown> = {
                  lockMovementX: originalObj.lockMovementX,
                  lockMovementY: originalObj.lockMovementY,
                  lockRotation: originalObj.lockRotation,
                  lockScalingX: originalObj.lockScalingX,
                  lockScalingY: originalObj.lockScalingY,
                  hasControls: originalObj.hasControls,
                };

                FABRIC_CUSTOM_PROPERTIES.forEach((prop) => {
                  const val = (
                    originalObj as unknown as Record<string, unknown>
                  )[prop];
                  if (val !== undefined) {
                    propsToCopy[prop] = val;
                  }
                });

                // Fallback for name if it was somehow stripped
                if (!propsToCopy.name) {
                  propsToCopy.name = img.name;
                }

                img.set(propsToCopy);
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

            const scaleX = options.artboardBounds.width / img.width;
            const scaleY = options.artboardBounds.height / img.height;

            // Remove the old background image BEFORE assigning the same ID
            // to the new image — prevents the find() from matching the new object
            const oldBg = canvas
              .getObjects()
              .find((o) => o.id === "obj_initial_image");
            if (oldBg) {
              canvas.remove(oldBg);
            }

            img.set({
              id: "obj_initial_image", // Mark as the new main image
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
