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
import { maskDataUrlToFile } from "../utils/mask-export";
import { compositeAIResult } from "../utils/composite-result";
import { MODELS } from "@quicklogo/ai-providers/models";

export type GenerationStatus =
  | "idle"
  | "exporting"
  | "uploading"
  | "generating"
  | "polling"
  | "compositing"
  | "done"
  | "error";

export function useCanvasAI(canvas: fabric.Canvas | null, imageId: string) {
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
      const canvasImageDataUrl = exportToDataUrl("png");
      if (!canvasImageDataUrl) throw new Error("Failed to export canvas");

      let targetBounds:
        | { left: number; top: number; width: number; height: number }
        | undefined;
      let activeObjectIdToReplace: string | null = null;

      if (state.canvasMode === "img2img") {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.id !== "__artboard__") {
          if (!activeObj.id) activeObj.set("id", `obj_${Date.now()}`);
          activeObjectIdToReplace = activeObj.id ?? null;
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
      if (state.canvasMode === "img2img" && targetBounds) {
        // Save state, discard selection to hide controls, and reset zoom (viewportTransform)
        // so that absolute coordinates (targetBounds) align perfectly.
        const active = canvas.getActiveObjects();
        canvas.discardActiveObject();
        const vpt = canvas.viewportTransform ? [...canvas.viewportTransform] : null;
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
            canvas.setActiveObject(new fabric.ActiveSelection(active, { canvas }));
          } else {
            canvas.setActiveObject(active[0]);
          }
        }
        canvas.renderAll();
      }

      setGenerationStatus("uploading");

      const dataUrlToFile = (dataUrl: string, filename: string) => {
        const arr = dataUrl.split(",");
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      };

      const canvasFile = dataUrlToFile(
        canvasImageDataUrl,
        `canvas-${Date.now()}.png`,
      );
      let maskFile: File | undefined;
      if (state.canvasMode === "inpaint" && state.maskData) {
        maskFile = maskDataUrlToFile(state.maskData);
      }
      let regionFile: File | undefined;
      if (regionImageDataUrl) {
        regionFile = dataUrlToFile(
          regionImageDataUrl,
          `region-${Date.now()}.png`,
        );
      }

      const [canvasImageUrl, maskImageUrl, uploadedRegionUrl] =
        await Promise.all([
          uploadFileToImageKit(canvasFile, "anonymous", { isTemp: true }),
          maskFile
            ? uploadFileToImageKit(maskFile, "anonymous", { isTemp: true })
            : Promise.resolve(undefined),
          regionFile
            ? uploadFileToImageKit(regionFile, "anonymous", { isTemp: true })
            : Promise.resolve(undefined),
        ]);

      setGenerationStatus("generating");

      const payload = {
        prompt: state.aiPrompt,
        sourceImageId: imageId,
        config: {
          model: state.aiModel,
          brandName: "",
          imageCount: 1,
          style: "",
          colorPalette: "auto",
          background: "transparent",
          customBgColor: "#ffffff",
          referenceImageUrl: uploadedRegionUrl || canvasImageUrl,
          referenceStrength:
            state.canvasMode === "sketch2img"
              ? Math.min(state.aiStrength, 40)
              : state.aiStrength,
          magicPrompt: false,
          canvasMode: state.canvasMode,
          maskImageUrl: maskImageUrl || undefined,
          canvasImageUrl: canvasImageUrl,
        },
      };

      // @ts-expect-error - Hono RPC types mismatch for json payload
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
  }, [canvas, isGenerating, exportToDataUrl, imageId, queryClient]);

  const availableModels = useMemo(() => {
    // Return all models or filter based on mode if needed
    // Inpaint usually needs specific models if supported, but for now we'll just return all
    return MODELS;
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
