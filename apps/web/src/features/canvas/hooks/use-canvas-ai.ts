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
  const store = useCanvasStore();
  const { exportToDataUrl } = useCanvasExport(canvas);
  const queryClient = useQueryClient();
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const isGenerating = store.isAiGenerating;

  const handleGenerate = useCallback(async () => {
    if (!canvas || isGenerating) return;

    if (!store.aiPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (store.canvasMode === "inpaint" && !store.maskData) {
      toast.error("Please paint a mask first");
      return;
    }

    if ((store.canvasMode === "img2img" || store.canvasMode === "text2img") && !store.regionBounds) {
      toast.error("Please select a region first");
      return;
    }

    try {
      store.setIsAiGenerating(true);
      setGenerationStatus("exporting");

      // Export Full Canvas
      const canvasImageDataUrl = exportToDataUrl("png");
      if (!canvasImageDataUrl) throw new Error("Failed to export canvas");

      // Export Region if needed
      let regionImageDataUrl: string | undefined;
      if ((store.canvasMode === "img2img" || store.canvasMode === "text2img") && store.regionBounds) {
        regionImageDataUrl = canvas.toDataURL({
          format: "png",
          left: store.regionBounds.left,
          top: store.regionBounds.top,
          width: store.regionBounds.width,
          height: store.regionBounds.height,
          multiplier: 1,
        });
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

      const canvasFile = dataUrlToFile(canvasImageDataUrl, `canvas-${Date.now()}.png`);
      const canvasImageUrl = await uploadFileToImageKit(canvasFile);

      let maskImageUrl: string | undefined;
      if (store.canvasMode === "inpaint" && store.maskData) {
        const maskFile = maskDataUrlToFile(store.maskData);
        maskImageUrl = await uploadFileToImageKit(maskFile);
      }

      let uploadedRegionUrl: string | undefined;
      if (regionImageDataUrl) {
        const regionFile = dataUrlToFile(regionImageDataUrl, `region-${Date.now()}.png`);
        uploadedRegionUrl = await uploadFileToImageKit(regionFile);
      }

      setGenerationStatus("generating");

      const payload = {
        prompt: store.aiPrompt,
        sourceImageId: imageId,
        config: {
          model: store.aiModel,
          brandName: "",
          imageCount: 1,
          style: "",
          colorPalette: "auto",
          background: "transparent",
          customBgColor: "#ffffff",
          referenceImageUrl: uploadedRegionUrl || canvasImageUrl,
          referenceStrength:
            store.canvasMode === "sketch2img"
              ? Math.min(store.aiStrength, 40)
              : store.aiStrength,
          magicPrompt: false,
          canvasMode: store.canvasMode,
          maskImageUrl: maskImageUrl || undefined,
          canvasImageUrl: canvasImageUrl,
        },
      };

      // @ts-ignore
      const res = await api.generate.edit.$post({ json: payload });
      if (!res.ok) {
         throw await parseApiError(res);
      }
      
      const { imageId: newImageId } = await res.json();

      setGenerationStatus("polling");

      // Polling logic
      const poll = async () => {
        while (true) {
          const pollRes = await api.images[":id"].$get({ param: { id: newImageId } });
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.image?.status === "completed" && data.image?.imageUrl) {
              return data.image.imageUrl;
            }
            if (data.image?.status === "failed") {
              throw new Error("Generation failed on server");
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      };

      const finalImageUrl = await poll();

      setGenerationStatus("compositing");
      
      const artboard = canvas.getObjects().find((o) => (o as any).id === "__artboard__");
      const artboardBounds = artboard 
        ? { 
            left: artboard.left!, 
            top: artboard.top!, 
            width: artboard.width! * (artboard.scaleX || 1), 
            height: artboard.height! * (artboard.scaleY || 1) 
          }
        : { left: 0, top: 0, width: canvas.width!, height: canvas.height! };

      await compositeAIResult(canvas, finalImageUrl, store.canvasMode, {
        regionBounds: store.regionBounds ?? undefined,
        artboardBounds,
      });

      store.setGeneratedResultUrl(finalImageUrl);

      // Clear AI modes
      store.setCanvasMode("edit");
      store.setRegionBounds(null);
      store.setMaskData(null);

      // Invalidate credits
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
      
      setGenerationStatus("done");
      toast.success("AI generation complete — placed on canvas");

    } catch (err: any) {
      console.error(err);
      if (err instanceof ApiError && err.code === ERROR_CODES.INSUFFICIENT_CREDITS) {
        toast.error("Not enough credits", { description: err.message });
      } else {
        toast.error(err.message || "Generation failed");
      }
      setGenerationStatus("error");
    } finally {
      store.setIsAiGenerating(false);
      // Wait a bit before resetting status so UI can show 'done'
      setTimeout(() => setGenerationStatus("idle"), 2000);
    }
  }, [canvas, isGenerating, store, exportToDataUrl, imageId, queryClient]);

  const availableModels = useMemo(() => {
    // Return all models or filter based on mode if needed
    // Inpaint usually needs specific models if supported, but for now we'll just return all
    return MODELS;
  }, [store.canvasMode]);

  const selectedModelInfo = availableModels.find((m) => m.id === store.aiModel);
  const credits = selectedModelInfo?.credits || 10;

  return {
    handleGenerate,
    isGenerating,
    generationStatus,
    credits,
    availableModels,
  };
}
