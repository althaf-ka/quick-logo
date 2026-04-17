import React from "react";
import { StyleSheetManager } from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import FilerobotImageEditor, {
  TABS,
  TOOLS,
} from "react-filerobot-image-editor";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { toast } from "@quicklogo/ui/components/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/api-error";

declare global {
  interface Window {
    React?: typeof React;
  }
}

// Polyfill for react-filerobot-image-editor which expects React to be global in some bundled components
if (typeof window !== "undefined") {
  window.React = React;
}

interface QuickLogoEditorProps {
  initialImageUrl: string;
  imageId: string;
  onClose: () => void;
  onSaveComplete: (newImageId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EditedImageData extends Record<string, any> {
  imageBase64?: string;
  extension?: string;
}

interface SaveEditResponse {
  imageId: string;
}

function getBase64Payload(dataUrl: string): string {
  const parts = dataUrl.split(",");
  return parts[1] ?? "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [meta, data] = dataUrl.split(",");
  if (!meta || !data) {
    throw new Error("Invalid image data");
  }

  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mimeType });
}

type EditorTabId = (typeof TABS)[keyof typeof TABS];
const finetuneTab = (TABS as Partial<Record<"FINETUNE", EditorTabId>>).FINETUNE;
const TABS_IDS: EditorTabId[] = finetuneTab
  ? [TABS.ANNOTATE, TABS.ADJUST, finetuneTab, TABS.FILTERS]
  : [TABS.ANNOTATE, TABS.ADJUST, TABS.FILTERS];
const ROTATE_CONFIG = { angle: 90, componentType: "slider" as const };
const EDITOR_THEME = {
  palette: {
    "bg-primary": "#09090b",
    "bg-primary-active": "#18181b",
    "bg-secondary": "#111217",
    "accent-primary": "#e4e4e7",
    "accent-primary-active": "#fafafa",
    "icons-primary": "#f4f4f5",
    "icons-secondary": "#a1a1aa",
    "borders-secondary": "#27272a",
    "borders-primary": "#3f3f46",
    "borders-strong": "#52525b",
    "light-shadow": "rgba(0, 0, 0, 0.35)",
    warning: "#ef4444",
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
};

export function QuickLogoEditor({
  initialImageUrl,
  imageId,
  onClose,
  onSaveComplete,
}: QuickLogoEditorProps) {
  const queryClient = useQueryClient();

  const saveEditedImage = useMutation({
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      const res = await api.images[":id"]["canvas-save"].$post({
        param: { id: imageId },
        json: {
          imageUrl,
          prompt: "Canvas Edit",
        },
      });
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return (await res.json()) as SaveEditResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["image-history", imageId] });
    },
  });

  const handleSave = async (editedImageObject: EditedImageData) => {
    if (saveEditedImage.isPending) {
      return;
    }

    if (!editedImageObject.imageBase64) {
      toast.error("Failed to acquire image data from the canvas");
      return;
    }

    try {
      const outputFormat = editedImageObject.extension || "png";
      const base64Payload = getBase64Payload(editedImageObject.imageBase64);
      const approxRawBytes = Math.floor((base64Payload.length * 3) / 4);

      const file = dataUrlToFile(
        editedImageObject.imageBase64,
        `canvas-edit-${Date.now()}.${outputFormat}`,
      );
      console.log("[canvas-save] export", {
        format: outputFormat,
        approxRawSizeBytes: approxRawBytes,
        approxRawSize: formatBytes(approxRawBytes),
        uploadSizeBytes: file.size,
        uploadSize: formatBytes(file.size),
        mimeType: file.type,
      });

      const uploadResultUrl = await uploadFileToImageKit(file);

      const savedVersion = await saveEditedImage.mutateAsync({
        imageUrl: uploadResultUrl,
      });

      toast.success("Design saved successfully!");
      if (savedVersion?.imageId) {
        onSaveComplete(savedVersion.imageId);
      } else {
        onSaveComplete(imageId);
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save edited design");
      throw error; // Let Filerobot catch the error and stop the spinner
    }
  };

  return (
    <div className="bg-background relative flex size-full min-h-0 flex-col overflow-hidden">
      <StyleSheetManager shouldForwardProp={isPropValid}>
        <FilerobotImageEditor
          source={initialImageUrl}
          onSave={handleSave}
          onClose={onClose}
          annotationsCommon={{ fill: "#111827" }}
          Text={{ text: "Your Brand Name" }}
          Rotate={ROTATE_CONFIG}
          tabsIds={TABS_IDS}
          defaultTabId={TABS.ADJUST}
          savingPixelRatio={1}
          previewPixelRatio={
            typeof window !== "undefined" ? window.devicePixelRatio : 1
          }
          theme={EDITOR_THEME}
          useBackendTranslations={false}
          defaultSavedImageType="png"
          defaultSavedImageQuality={0.92}
          forceToPngInEllipticalCrop={true}
          disableSaveIfNoChanges={true}
          defaultToolId={TOOLS.TEXT}
        />
      </StyleSheetManager>
    </div>
  );
}
