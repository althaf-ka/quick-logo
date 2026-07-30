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

    const handleError = () =>
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

interface CompositeOptions {
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
}

function loadFabricImage(url: string): Promise<fabric.FabricImage> {
  return fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
}

function hasValidDimensions(image: fabric.FabricImage): boolean {
  return (
    typeof image.width === "number" &&
    image.width > 0 &&
    typeof image.height === "number" &&
    image.height > 0
  );
}

export async function compositeAIResult(
  canvas: fabric.Canvas,
  resultImageUrl: string,
  mode: CanvasMode,
  options: CompositeOptions,
): Promise<fabric.FabricImage> {
  const resultImage = await loadFabricImage(resultImageUrl);
  if (!hasValidDimensions(resultImage)) {
    throw new Error(
      "AI result image has invalid dimensions — the image may have failed to load",
    );
  }

  let finalImageUrl = resultImageUrl;
  if (mode === "inpaint" && options.maskDataUrl && options.originalImageUrl) {
    try {
      finalImageUrl = await applyFrontendMaskComposite(
        options.originalImageUrl,
        resultImageUrl,
        options.maskDataUrl,
      );
    } catch (error) {
      console.error(
        "Frontend mask compositing failed, falling back to raw generated image",
        error,
      );
    }
  }

  const compositedImage = await loadFabricImage(finalImageUrl);
  if (!hasValidDimensions(compositedImage)) {
    throw new Error("Composited image lacks dimensions");
  }

  const regionSelector = canvas
    .getObjects()
    .find((object) => object.id === "__ai_region__");

  switch (mode) {
    case "img2img": {
      const { regionBounds } = options;
      if (!regionBounds) {
        throw new Error("Region bounds required for img2img");
      }

      compositedImage.set({
        left: regionBounds.left,
        top: regionBounds.top,
        scaleX: regionBounds.width / compositedImage.width,
        scaleY: regionBounds.height / compositedImage.height,
        name: "AI Result — Img2Img",
        selectable: true,
        generationGroupId: options.generationGroupId,
        generatedFromObjectId: options.generatedFromObjectId,
      });

      if (options.generatedFromObjectId) {
        const originalObject = canvas
          .getObjects()
          .find((object) => object.id === options.generatedFromObjectId);

        if (originalObject) {
          const propertiesToCopy: Record<string, unknown> = {
            lockMovementX: originalObject.lockMovementX,
            lockMovementY: originalObject.lockMovementY,
            lockRotation: originalObject.lockRotation,
            lockScalingX: originalObject.lockScalingX,
            lockScalingY: originalObject.lockScalingY,
            hasControls: originalObject.hasControls,
          };

          for (const property of FABRIC_CUSTOM_PROPERTIES) {
            const value = Reflect.get(originalObject, property);
            if (value !== undefined) {
              propertiesToCopy[property] = value;
            }
          }

          if (!propertiesToCopy.name) {
            propertiesToCopy.name = resultImage.name;
          }

          compositedImage.set(propertiesToCopy);
          canvas.remove(originalObject);
        }
      }

      if (regionSelector) {
        canvas.remove(regionSelector);
      }
      break;
    }

    case "inpaint": {
      const { artboardBounds } = options;
      if (!artboardBounds) {
        throw new Error("Artboard bounds required for inpaint");
      }

      const oldBackground = canvas
        .getObjects()
        .find((object) => object.id === "obj_initial_image");
      if (oldBackground) {
        canvas.remove(oldBackground);
      }

      compositedImage.set({
        id: "obj_initial_image",
        left: artboardBounds.left,
        top: artboardBounds.top,
        scaleX: artboardBounds.width / compositedImage.width,
        scaleY: artboardBounds.height / compositedImage.height,
        name: "AI Result — Inpaint",
        selectable: true,
        generationGroupId: options.generationGroupId,
        generatedFromObjectId: options.generatedFromObjectId,
      });
      break;
    }

    case "edit":
      break;
  }

  canvas.add(compositedImage);
  canvas.setActiveObject(compositedImage);
  canvas.requestRenderAll();

  return compositedImage;
}
