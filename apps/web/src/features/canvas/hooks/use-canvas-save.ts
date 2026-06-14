import { useState, useCallback, useRef, useEffect } from "react";
import * as fabric from "fabric";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import { parseApiError } from "@/lib/api-error";

interface CanvasSaveProps {
  canvas: fabric.Canvas | null;
  imageId: string;
  onSaveComplete?: (newImageId: string) => void;
  exportToPng: () => Promise<Blob>;
}

export function useCanvasSave({ canvas, imageId, onSaveComplete, exportToPng }: CanvasSaveProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isCanvasLoaded = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleLoaded = () => {
      isCanvasLoaded.current = true;
    };
    window.addEventListener("canvas:loaded", handleLoaded);
    return () => window.removeEventListener("canvas:loaded", handleLoaded);
  }, []);

  useEffect(() => {
    if (!canvas) return;

    let timeoutId: NodeJS.Timeout;
    
    const handleLocalSave = () => {
      if (!isCanvasLoaded.current) return;
      setIsDirty(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // @ts-expect-error - Fabric 6 types
        const json = canvas.toJSON(["id", "name", "selectable", "evented", "locked"]);
        delete json.viewportTransform;
        localStorage.setItem(`quicklogo_canvas_${imageId}`, JSON.stringify(json));
      }, 500);
    };

    canvas.on("object:added", handleLocalSave);
    canvas.on("object:modified", handleLocalSave);
    canvas.on("object:removed", handleLocalSave);

    return () => {
      clearTimeout(timeoutId);
      canvas.off("object:added", handleLocalSave);
      canvas.off("object:modified", handleLocalSave);
      canvas.off("object:removed", handleLocalSave);
    };
  }, [canvas, imageId]);

  const saveMutation = useMutation({
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      const res = await api.images[":id"]["canvas-save"].$post({
        param: { id: imageId },
        json: { imageUrl, prompt: "Canvas Edit" },
      });
      if (!res.ok) throw await parseApiError(res);
      return res.json() as Promise<{ imageId: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["image-history", imageId] });
    },
  });

  const { mutateAsync: saveStateMutateAsync } = useMutation<void, Error, { id: string; canvasState: string }>({
    mutationFn: async ({ id, canvasState }) => {
      const res = await api.canvas[":id"]["state"].$put({
        param: { id },
        json: { canvasState },
      });
      if (!res.ok) throw await parseApiError(res);
    },
  });

  const { mutateAsync: saveImage } = saveMutation;

  const handleSave = useCallback(async () => {
    if (!canvas || isSaving) return;
    setIsSaving(true);
    try {
      const blob = await Promise.resolve(exportToPng());
      if (!blob) throw new Error("Export failed");
      const file = new File([blob], `canvas-edit-${Date.now()}.png`, {
        type: "image/png",
      });
      const uploadUrl = await uploadFileToImageKit(file);
      const saved = await saveImage({ imageUrl: uploadUrl });
      
      // @ts-expect-error - Fabric 6 types
      const json = canvas.toJSON(["id", "name", "selectable", "evented", "locked"]);
      delete json.viewportTransform;
      await saveStateMutateAsync({ id: saved.imageId || imageId, canvasState: JSON.stringify(json) });
      
      localStorage.removeItem(`quicklogo_canvas_${imageId}`);
      setIsDirty(false);
      
      toast.success("Design saved successfully!");
      if (onSaveComplete) onSaveComplete(saved.imageId || imageId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save edited design");
    } finally {
      setIsSaving(false);
    }
  }, [canvas, exportToPng, saveImage, saveStateMutateAsync, imageId, onSaveComplete, isSaving]);

  return { handleSave, isSaving, isDirty };
}
