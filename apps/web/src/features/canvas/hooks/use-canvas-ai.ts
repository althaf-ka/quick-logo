import { useState, useCallback, useMemo } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../store/canvas-store";
import { useCanvasExport } from "./use-canvas-export";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AUTH_KEYS } from "@/hooks/use-auth";
import { parseApiError, ApiError, ERROR_CODES } from "@/lib/api-error";
import {
  maskDataUrlToFile,
  dataUrlToFile,
  invertMaskDataUrl,
} from "../utils/mask-export";
import { compositeAIResult } from "../utils/composite-result";
import {
  getModelsForCanvasMode,
  getModelMaskPolarity,
} from "@quicklogo/ai-providers/models";
import { FABRIC_CUSTOM_PROPERTIES } from "../utils/fabric-properties";
import type { EditApiRequest } from "@quicklogo/shared";

export type GenerationStatus =
  | "idle"
  | "exporting"
  | "uploading"
  | "generating"
  | "polling"
  | "compositing"
  | "done"
  | "error";

export function useCanvasAI(
  canvas: fabric.Canvas | null,
  imageId: string,
  isDirty?: boolean,
  initialImageUrl?: string,
) {
  const isGenerating = useCanvasStore((s) => s.isAiGenerating);
  const aiModel = useCanvasStore((s) => s.aiModel);
  const { exportToDataUrl } = useCanvasExport(canvas);
  const queryClient = useQueryClient();
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [generationBounds, setGenerationBounds] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!canvas || isGenerating) return;

    const state = useCanvasStore.getState();

    if (!state.aiPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (state.canvasMode === "inpaint" && !state.maskData) {
      toast.error("Please paint a mask first");
      return;
    }

    try {
      state.setIsAiGenerating(true);
      setGenerationStatus("exporting");

      // Export Full Canvas
      let canvasImageUrlPromise: Promise<string>;
      let canvasImageDataUrl: string | undefined;

      // Optimization: If the canvas is completely untouched, we can reuse the original image URL!
      if (isDirty === false && initialImageUrl) {
        canvasImageUrlPromise = Promise.resolve(initialImageUrl);
      } else {
        canvasImageDataUrl = exportToDataUrl("png");
        if (!canvasImageDataUrl) throw new Error("Failed to export canvas");

        const canvasFile = dataUrlToFile(
          canvasImageDataUrl,
          `canvas-${Date.now()}.png`,
        );
        canvasImageUrlPromise = uploadFileToImageKit(canvasFile, "anonymous", {
          isTemp: true,
        });
      }

      let targetBounds:
        | { left: number; top: number; width: number; height: number }
        | undefined;
      let activeObjectIdToReplace: string | null = null;
      let isPristineSourceImage = false;

      if (state.canvasMode === "img2img") {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.id !== "__artboard__") {
          if (!activeObj.id) activeObj.set("id", `obj_${Date.now()}`);
          activeObjectIdToReplace = activeObj.id ?? null;
          isPristineSourceImage =
            activeObjectIdToReplace === "obj_initial_image" &&
            isDirty === false;

          state.setActiveAIObjectId(activeObjectIdToReplace);

          // getBoundingRect() ensures we get the absolute top-left coordinates
          // regardless of whether the object's originX/originY is 'center'.
          const rect = activeObj.getBoundingRect();
          targetBounds = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
          setGenerationBounds(targetBounds);
        } else {
          toast.error("Please select an image first");
          setGenerationStatus("idle");
          state.setIsAiGenerating(false);
          return;
        }
      }

      // Export Region if needed
      let regionImageDataUrl: string | undefined;
      let uploadedRegionUrlPromise: Promise<string | undefined> =
        Promise.resolve(undefined);

      if (state.canvasMode === "img2img" && targetBounds) {
        if (isPristineSourceImage && initialImageUrl) {
          // Optimization: Skip region export/upload entirely, use the original image!
          uploadedRegionUrlPromise = Promise.resolve(initialImageUrl);
        } else {
          // Save state, discard selection to hide controls, and reset zoom (viewportTransform)
          // so that absolute coordinates (targetBounds) align perfectly.
          const active = canvas.getActiveObjects();
          canvas.discardActiveObject();
          const vpt = canvas.viewportTransform
            ? [...canvas.viewportTransform]
            : null;
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          canvas.renderAll(); // MUST be synchronous

          regionImageDataUrl = canvas.toDataURL({
            format: "png",
            left: targetBounds.left,
            top: targetBounds.top,
            width: targetBounds.width,
            height: targetBounds.height,
            multiplier: 1,
          });

          // Restore state
          if (vpt) canvas.setViewportTransform(vpt as fabric.TMat2D);
          if (active && active.length) {
            if (active.length > 1) {
              canvas.setActiveObject(
                new fabric.ActiveSelection(active, { canvas }),
              );
            } else {
              canvas.setActiveObject(active[0]);
            }
          }
          canvas.renderAll();
        }
      }

      setGenerationStatus("uploading");

      let maskFile: File | undefined;
      if (state.canvasMode === "inpaint" && state.maskData) {
        let finalMaskData = state.maskData;
        // Data-driven mask polarity: invert the mask if the selected model
        // expects inverted polarity (e.g., Ideogram uses black=inpaint)
        const polarity = getModelMaskPolarity(state.aiModel);
        if (polarity === "inverted") {
          finalMaskData = await invertMaskDataUrl(state.maskData);
        }
        maskFile = maskDataUrlToFile(finalMaskData);
      }
      let regionFile: File | undefined;
      if (regionImageDataUrl) {
        regionFile = dataUrlToFile(
          regionImageDataUrl,
          `region-${Date.now()}.png`,
        );
        uploadedRegionUrlPromise = uploadFileToImageKit(
          regionFile,
          "anonymous",
          { isTemp: true },
        );
      }

      const [canvasImageUrl, maskImageUrl, uploadedRegionUrl] =
        await Promise.all([
          canvasImageUrlPromise,
          maskFile
            ? uploadFileToImageKit(maskFile, "anonymous", { isTemp: true })
            : Promise.resolve(undefined),
          uploadedRegionUrlPromise,
        ]);

      setGenerationStatus("generating");

      const payload: EditApiRequest = {
        prompt: state.aiPrompt,
        sourceImageId: imageId,
        config: {
          model: state.aiModel as EditApiRequest["config"]["model"],
          brandName: "",
          imageCount: 1,
          style: "",
          colorPalette: "auto",
          background: "transparent",
          customBgColor: "#ffffff",
          referenceImageUrl: uploadedRegionUrl || canvasImageUrl || undefined,
          referenceStrength: state.aiStrength,
          magicPrompt: false,
          canvasMode:
            state.canvasMode as EditApiRequest["config"]["canvasMode"],
          maskImageUrl: maskImageUrl || undefined,
          canvasImageUrl: canvasImageUrl || undefined,
        },
      };

      const res = await api.canvas["ai-edit"].$post({ json: payload });
      if (!res.ok) {
        throw await parseApiError(res);
      }

      const { imageId: newImageId } = await res.json();

      setGenerationStatus("polling");

      // Polling logic
      const MAX_POLL_ATTEMPTS = 60; // 60 × 10s = 10 min timeout
      const poll = async () => {
        let attempts = 0;
        while (attempts < MAX_POLL_ATTEMPTS) {
          const pollRes = await api.images[":id"].$get({
            param: { id: newImageId },
          });
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.image?.status === "completed" && data.image?.imageUrl) {
              return data.image.imageUrl;
            }
            if (data.image?.status === "failed") {
              throw new Error("Generation failed on server");
            }
          }
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
        throw new Error("Generation timed out — please try again");
      };

      const finalImageUrl = await poll();

      setGenerationStatus("compositing");

      const artboard = canvas.getObjects().find((o) => o.id === "__artboard__");
      const artboardBounds = artboard
        ? {
            left: artboard.left!,
            top: artboard.top!,
            width: artboard.width! * (artboard.scaleX || 1),
            height: artboard.height! * (artboard.scaleY || 1),
          }
        : { left: 0, top: 0, width: canvas.width!, height: canvas.height! };

      const generationGroupId = `gen_${Date.now()}`;

      await compositeAIResult(canvas, finalImageUrl, state.canvasMode, {
        regionBounds: targetBounds,
        artboardBounds,
        generationGroupId,
        generatedFromObjectId: activeObjectIdToReplace,
      });

      state.setGeneratedResultUrl(finalImageUrl);

      // Silently update the canvas state in DB to preserve the project
      // without forcing a redundant "Canvas Edit" save.
      try {
        const json = canvas.toObject(FABRIC_CUSTOM_PROPERTIES);
        delete json.viewportTransform;
        await api.canvas[":id"]["state"].$put({
          param: { id: imageId },
          json: { canvasState: JSON.stringify(json) },
        });
        // Dispatch event to clear the dirty flag in useCanvasSave
        window.dispatchEvent(new CustomEvent("canvas:saved"));
      } catch (e) {
        console.error("Failed to auto-save canvas state after AI composite", e);
      }

      // Clear AI workflow
      state.resetAIWorkflow();

      // Invalidate credits
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });

      setGenerationStatus("done");
      toast.success("AI image generated successfully");
    } catch (err) {
      const error = err as Error & { code?: string };
      console.error(error);
      const state = useCanvasStore.getState();
      if (
        error instanceof ApiError &&
        error.code === ERROR_CODES.INSUFFICIENT_CREDITS
      ) {
        toast.error("Not enough credits", { description: error.message });
      } else {
        toast.error(error.message || "Generation failed");
      }
      // Set error explicitly
      state.resetAIWorkflow();
      setGenerationStatus("error");
    } finally {
      const state = useCanvasStore.getState();
      state.setIsAiGenerating(false);
      // Wait a bit before resetting status so UI can show 'done'
      setTimeout(() => {
        setGenerationStatus("idle");
        setGenerationBounds(null);
      }, 2000);
    }
  }, [
    canvas,
    isGenerating,
    exportToDataUrl,
    imageId,
    queryClient,
    isDirty,
    initialImageUrl,
  ]);

  const availableModels = useMemo(() => {
    const state = useCanvasStore.getState();
    return getModelsForCanvasMode(state.canvasMode);
  }, []);

  const selectedModelInfo = availableModels.find((m) => m.id === aiModel);
  const credits = selectedModelInfo?.credits || 10;

  return {
    handleGenerate,
    isGenerating,
    generationStatus,
    generationBounds,
    credits,
    availableModels,
  };
}
