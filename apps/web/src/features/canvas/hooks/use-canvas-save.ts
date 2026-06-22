import { useState, useCallback, useRef, useEffect } from "react";
import * as fabric from "fabric";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import { parseApiError } from "@/lib/api-error";
import { FABRIC_CUSTOM_PROPERTIES } from "../utils/fabric-properties";

interface CanvasSaveProps {
  canvas: fabric.Canvas | null;
  imageId: string;
  onSaveComplete?: (newImageId: string) => void;
  exportToPng: () => Promise<Blob>;
}

export function useCanvasSave({
  canvas,
  imageId,
  onSaveComplete,
  exportToPng,
}: CanvasSaveProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isCanvasLoaded = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const getCleanState = useCallback((c: fabric.Canvas) => {
    const json = c.toObject(FABRIC_CUSTOM_PROPERTIES);
    json.objects = json.objects.filter((o: any) => o.id !== "__artboard__");
    return JSON.stringify(json);
  }, []);

  useEffect(() => {
    const handleLoaded = () => {
      isCanvasLoaded.current = true;
      if (canvas) {
        lastSavedStateRef.current = getCleanState(canvas);
      }
    };
    const handleSaved = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (canvas) {
        lastSavedStateRef.current = getCleanState(canvas);
      }
      setIsDirty(false);
      localStorage.removeItem(`quicklogo_canvas_${imageId}`);
    };
    window.addEventListener("canvas:loaded", handleLoaded);
    window.addEventListener("canvas:saved", handleSaved);
    return () => {
      window.removeEventListener("canvas:loaded", handleLoaded);
      window.removeEventListener("canvas:saved", handleSaved);
    };
  }, [imageId, canvas, getCleanState]);

  useEffect(() => {
    if (!canvas) return;

    const handleLocalSave = () => {
      if (!isCanvasLoaded.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(() => {
        // @ts-expect-error __isHistoryChanging is a custom property attached during undo/redo
        if (canvas.__isHistoryChanging) return;

        const json = canvas.toObject(FABRIC_CUSTOM_PROPERTIES);
        delete json.viewportTransform;

        const currentState = getCleanState(canvas);
        if (currentState === lastSavedStateRef.current) {
          setIsDirty(false);
        } else {
          setIsDirty(true);
        }

        localStorage.setItem(
          `quicklogo_canvas_${imageId}`,
          JSON.stringify(json),
        );
      }, 500);
    };

    canvas.on("object:added", handleLocalSave);
    canvas.on("object:modified", handleLocalSave);
    canvas.on("object:removed", handleLocalSave);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      canvas.off("object:added", handleLocalSave);
      canvas.off("object:modified", handleLocalSave);
      canvas.off("object:removed", handleLocalSave);
    };
  }, [canvas, imageId, getCleanState]);

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

  const { mutateAsync: saveStateMutateAsync } = useMutation<
    void,
    Error,
    { id: string; canvasState: string }
  >({
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

      const json = canvas.toObject(FABRIC_CUSTOM_PROPERTIES);
      delete json.viewportTransform;
      await saveStateMutateAsync({
        id: saved.imageId || imageId,
        canvasState: JSON.stringify(json),
      });

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
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
  }, [
    canvas,
    exportToPng,
    saveImage,
    saveStateMutateAsync,
    imageId,
    onSaveComplete,
    isSaving,
  ]);

  return { handleSave, isSaving, isDirty };
}
