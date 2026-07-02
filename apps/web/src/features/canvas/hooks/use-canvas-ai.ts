import { useState, useCallback, useRef } from "react";
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
import { FABRIC_CUSTOM_PROPERTIES } from "../utils/fabric-properties";
import { compressCanvasState } from "../utils/canvas-compression";
import { useSelectedModel } from "./use-selected-model";
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

export function useCanvasAI(canvas: fabric.Canvas | null, imageId: string) {
  const {
    models: availableModels,
    credits,
    selectedModel,
  } = useSelectedModel();

  const isGenerating = useCanvasStore((s) => s.isAiGenerating);
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

  // AbortController ref for cancelling in-flight network requests on unmount or re-generation
  const abortRef = useRef<AbortController | null>(null);

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
      // Abort any previous in-flight generation
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      state.setIsAiGenerating(true);
      setGenerationStatus("exporting");

      console.info("[Canvas AI] Generation started", {
        mode: state.canvasMode,
        model: state.aiModel,
        strategy: selectedModel?.editingStrategy,
        hasMask: !!state.maskData,
      });

      // Export Full Canvas
      const canvasImageDataUrl = exportToDataUrl("png");
      if (!canvasImageDataUrl) throw new Error("Failed to export canvas");

      const canvasFile = dataUrlToFile(
        canvasImageDataUrl,
        `canvas-${Date.now()}.png`,
      );
      const canvasImageUrlPromise = uploadFileToImageKit(
        canvasFile,
        "anonymous",
        {
          isTemp: true,
          signal,
        },
      );

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
      let uploadedRegionUrlPromise: Promise<string | undefined> =
        Promise.resolve(undefined);

      if (state.canvasMode === "img2img" && targetBounds) {
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

      setGenerationStatus("uploading");

      let maskFile: File | undefined;
      if (state.canvasMode === "inpaint" && state.maskData) {
        let finalMaskData = state.maskData;
        // Data-driven mask polarity: invert the mask if the selected model
        // expects inverted polarity (e.g., Ideogram uses black=inpaint)
        const polarity = selectedModel?.maskPolarity ?? "standard";
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
          { isTemp: true, signal },
        );
      }

      const [canvasImageUrl, maskImageUrl, uploadedRegionUrl] =
        await Promise.all([
          canvasImageUrlPromise,
          maskFile
            ? uploadFileToImageKit(maskFile, "anonymous", {
                isTemp: true,
                signal,
              })
            : Promise.resolve(undefined),
          uploadedRegionUrlPromise,
        ]);

      setGenerationStatus("generating");

      const payload: EditApiRequest = {
        prompt: state.aiPrompt,
        sourceImageId: imageId,
        config: {
          model: state.aiModel as EditApiRequest["config"]["model"],
          imageCount: 1,
          referenceImageUrl: uploadedRegionUrl || canvasImageUrl || undefined,
          magicPrompt: state.canvasMode === "img2img",
          canvasMode:
            state.canvasMode as EditApiRequest["config"]["canvasMode"],
          maskImageUrl: maskImageUrl || undefined,
          canvasImageUrl: canvasImageUrl || undefined,
        },
      };

      const res = await api.canvas["ai-edit"].$post(
        { json: payload },
        { init: { signal } },
      );
      if (!res.ok) {
        throw await parseApiError(res);
      }

      const { imageId: newImageId } = await res.json();

      setGenerationStatus("polling");

      // Polling logic with abort support
      const MAX_POLL_ATTEMPTS = 60; // 60 × 10s = 10 min timeout
      const poll = async () => {
        let attempts = 0;
        while (attempts < MAX_POLL_ATTEMPTS) {
          if (signal.aborted) {
            throw new Error("Generation was cancelled");
          }
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
          // Abortable sleep
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 10000);
            signal.addEventListener(
              "abort",
              () => {
                clearTimeout(timer);
                reject(new Error("Generation was cancelled"));
              },
              { once: true },
            );
          });
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
        ...(state.maskData && state.canvasMode === "inpaint"
          ? {
              maskDataUrl: state.maskData,
              originalImageUrl: canvasImageUrl || undefined,
            }
          : {}),
      });

      state.setGeneratedResultUrl(finalImageUrl);

      // Silently update the canvas state in DB to preserve the project
      // without forcing a redundant "Canvas Edit" save.
      try {
        const json = canvas.toObject(FABRIC_CUSTOM_PROPERTIES);
        delete json.viewportTransform;
        const compressedState = compressCanvasState(JSON.stringify(json));
        await api.canvas[":id"]["state"].$put({
          param: { id: imageId },
          json: { canvasState: compressedState },
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
      console.error("[Canvas AI] Generation failed", error);
      if (
        error instanceof ApiError &&
        error.code === ERROR_CODES.INSUFFICIENT_CREDITS
      ) {
        toast.error("Not enough credits", { description: error.message });
      } else if (error.message === "Generation was cancelled") {
        // Silently swallow cancellation — not an error the user needs to see
      } else {
        toast.error(error.message || "Generation failed");
      }
      useCanvasStore.getState().resetAIWorkflow();
      setGenerationStatus("error");
    } finally {
      useCanvasStore.getState().setIsAiGenerating(false);
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
    selectedModel,
  ]);

  return {
    handleGenerate,
    isGenerating,
    generationStatus,
    generationBounds,
    credits,
    availableModels,
    selectedModel,
  };
}
