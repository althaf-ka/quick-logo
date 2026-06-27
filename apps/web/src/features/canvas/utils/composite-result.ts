import * as fabric from "fabric";
import type { CanvasMode } from "../types/canvas";
import { FABRIC_CUSTOM_PROPERTIES } from "./fabric-properties";

async function applyFrontendMaskComposite(
  originalUrl: string,
  generatedUrl: string,
  maskUrl: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let loadedCount = 0;
    const origImg = new Image();
    const genImg = new Image();
    const maskImg = new Image();
    origImg.crossOrigin = "anonymous";
    genImg.crossOrigin = "anonymous";
    maskImg.crossOrigin = "anonymous";

    const checkDone = () => {
      loadedCount++;
      if (loadedCount === 3) {
        try {
          // Calculate scale factor to match genImg's high resolution while strictly preserving origImg's aspect ratio!
          // This prevents mask misalignment caused by the AI model cropping or changing the aspect ratio.
          const scale = Math.max(
            genImg.width / origImg.width,
            genImg.height / origImg.height,
          );

          const canvas = document.createElement("canvas");
          canvas.width = Math.round(origImg.width * scale);
          canvas.height = Math.round(origImg.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Failed to get 2D context");

          // 1. Draw original image
          ctx.drawImage(origImg, 0, 0, canvas.width, canvas.height);
          const outData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // 2. Extract Mask data
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = canvas.width;
          maskCanvas.height = canvas.height;
          const maskCtx = maskCanvas.getContext("2d");
          if (!maskCtx) throw new Error("Failed to get mask context");

          // Apply a gentle blur to soften the mask edges for a seamless blend (preventing harsh pixelation)
          // Kept small to avoid bleeding into areas where the user did not draw
          maskCtx.filter = "blur(4px)";
          maskCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
          const maskData = maskCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );

          // 3. Extract Generated Image data
          const genCanvas = document.createElement("canvas");
          genCanvas.width = canvas.width;
          genCanvas.height = canvas.height;
          const genCtx = genCanvas.getContext("2d");
          if (!genCtx) throw new Error("Failed to get generated context");
          genCtx.drawImage(genImg, 0, 0, canvas.width, canvas.height);
          const genData = genCtx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );

          // 4. Alpha blend: pixels where mask is white (R=255) get the generated image,
          // pixels where mask is black (R=0) keep the original image.
          // Since the mask might be anti-aliased, we use the red channel as an alpha weight.
          for (let i = 0; i < maskData.data.length; i += 4) {
            const maskAlpha = maskData.data[i] / 255.0; // 0 to 1 based on Red channel
            if (maskAlpha > 0) {
              outData.data[i] =
                genData.data[i] * maskAlpha + outData.data[i] * (1 - maskAlpha);
              outData.data[i + 1] =
                genData.data[i + 1] * maskAlpha +
                outData.data[i + 1] * (1 - maskAlpha);
              outData.data[i + 2] =
                genData.data[i + 2] * maskAlpha +
                outData.data[i + 2] * (1 - maskAlpha);
              outData.data[i + 3] =
                genData.data[i + 3] * maskAlpha +
                outData.data[i + 3] * (1 - maskAlpha);
            }
          }

          ctx.putImageData(outData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) {
          reject(e);
        }
      }
    };

    const handleError = (_e: string | Event) =>
      reject(new Error("Failed to load images for compositing"));

    origImg.onload = checkDone;
    origImg.onerror = handleError;
    origImg.src = originalUrl;
    genImg.onload = checkDone;
    genImg.onerror = handleError;
    genImg.src = generatedUrl;
    maskImg.onload = checkDone;
    maskImg.onerror = handleError;
    maskImg.src = maskUrl;
  });
}

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
    maskDataUrl?: string;
    originalImageUrl?: string;
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

        const proceedWithComposite = (finalImgUrl: string) => {
          FabricImageClass.fromURL(finalImgUrl, { crossOrigin: "anonymous" })
            .then((compositedImg: fabric.FabricImage) => {
              // Ensure we have valid dimensions on the composited image
              if (!compositedImg.width || !compositedImg.height)
                return reject(new Error("Composited image lacks dimensions"));

              // Find existing AI region selector to remove it
              const regionSelector = canvas
                .getObjects()
                .find((o) => o.id === "__ai_region__");

              switch (mode) {
                case "img2img": {
                  if (!options.regionBounds) {
                    return reject(
                      new Error("Region bounds required for img2img"),
                    );
                  }

                  // Scale to fit the region
                  const scaleX =
                    options.regionBounds.width / compositedImg.width;
                  const scaleY =
                    options.regionBounds.height / compositedImg.height;

                  compositedImg.set({
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

                      compositedImg.set(propsToCopy);
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
                    return reject(
                      new Error("Artboard bounds required for inpaint"),
                    );
                  }

                  const scaleX =
                    options.artboardBounds.width / compositedImg.width;
                  const scaleY =
                    options.artboardBounds.height / compositedImg.height;

                  // Remove the old background image BEFORE assigning the same ID
                  // to the new image — prevents the find() from matching the new object
                  const oldBg = canvas
                    .getObjects()
                    .find((o) => o.id === "obj_initial_image");
                  if (oldBg) {
                    canvas.remove(oldBg);
                  }

                  compositedImg.set({
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

              canvas.add(compositedImg);
              canvas.setActiveObject(compositedImg);
              canvas.requestRenderAll();
              // Since we modified the canvas, fire object:added so useCanvasHistory picks it up
              // (canvas.add already fires object:added internally, so no manual fire is strictly necessary)
              resolve(compositedImg);
            })
            .catch(reject);
        }; // end proceedWithComposite

        if (
          mode === "inpaint" &&
          options.maskDataUrl &&
          options.originalImageUrl
        ) {
          applyFrontendMaskComposite(
            options.originalImageUrl,
            resultImageUrl,
            options.maskDataUrl,
          )
            .then((blendedUrl: string) => proceedWithComposite(blendedUrl))
            .catch((err: Error) => {
              console.error(
                "Frontend mask compositing failed, falling back to raw generated image",
                err,
              );
              proceedWithComposite(resultImageUrl);
            });
        } else {
          proceedWithComposite(resultImageUrl);
        }
      })
      .catch(reject);
  });
}
