import { useState, useCallback, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import type {
  GenerateConfig,
  GenerationStatus,
  GeneratedLogo,
} from "@/types/generate";
import type { GenerateApiRequest } from "@quicklogo/shared";
import { DEFAULT_CONFIG, MODELS } from "@quicklogo/shared";
import { uploadFileToImageKit } from "@/lib/imagekit";
import { AUTH_KEYS, useAuth } from "@/hooks/use-auth";
import { useBatchStatus } from "./use-batch-status";
import { parseApiError, ApiError, ERROR_CODES } from "@/lib/api-error";

export function useGenerateForm() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<GenerateConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [results, setResults] = useState<GeneratedLogo[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  const updateConfig = useCallback(
    <K extends keyof GenerateConfig>(key: K, value: GenerateConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleReferenceImage = useCallback((file: File | null) => {
    if (!file) {
      setConfig((prev) => ({
        ...prev,
        referenceImage: null,
        referenceImagePreview: null,
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Reference image too large", {
        description: "Please use an image under 10MB.",
      });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const MAX = 512;
      let { width, height } = img;

      if (width > MAX || height > MAX) {
        const scale = MAX / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          setConfig((prev) => ({
            ...prev,
            referenceImage: new File([blob], file.name, {
              type: "image/webp",
            }),
            referenceImagePreview: canvas.toDataURL("image/webp", 0.8),
          }));
        },
        "image/webp",
        0.8,
      );
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const selectedModel = useMemo(
    () => MODELS.find((m) => m.id === config.model) ?? MODELS[0],
    [config.model],
  );

  const creditCost = useMemo(
    () => selectedModel.credits * config.imageCount,
    [selectedModel, config.imageCount],
  );

  const { data: batchData, isError: isBatchError } =
    useBatchStatus(activeBatchId);

  useEffect(() => {
    if (!activeBatchId) return;

    if (isBatchError) {
      // eslint-disable-next-line
      setStatus("error");
      setLocalError(
        "Failed to fetch generation status. Please try refreshing.",
      );
      return;
    }

    if (batchData) {
      const isProcessing = batchData.status === "processing";
      setStatus(isProcessing ? "polling" : "done");

      // Map API projects to GeneratedLogo format for display
      const newResults = batchData.projects
        .filter(
          (p) =>
            p.latestImage &&
            p.latestImage.status === "completed" &&
            p.latestImage.imageUrl,
        )
        .map((p) => ({
          id: p.latestImage!.id,
          url: p.latestImage!.imageUrl!,
          prompt,
          config,
          createdAt: new Date(),
        }));

      setResults(newResults);

      // Invalidate queries when done so history updates
      if (!isProcessing) {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        setActiveBatchId(null); // Stop polling
      }
    }
  }, [batchData, isBatchError, activeBatchId, prompt, config, queryClient]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: GenerateApiRequest) => {
      const res = await api.generate.index.$post({ json: data });
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.code === ERROR_CODES.INSUFFICIENT_CREDITS
      ) {
        toast.error("Not enough credits", {
          description: error.message,
        });
        return;
      }
      toast.error("Generation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const canGenerate =
    prompt.trim().length > 0 &&
    status !== "generating" &&
    status !== "polling" &&
    !isPending;

  const handleGenerate = useCallback(
    async (customPrompt?: string) => {
      const activePrompt = customPrompt !== undefined ? customPrompt : prompt;
      if (
        activePrompt.trim().length === 0 ||
        status === "generating" ||
        status === "polling" ||
        isPending
      )
        return;

      if (customPrompt !== undefined) {
        setPrompt(customPrompt);
      }

      setStatus("generating");
      setLocalError(null);
      setResults([]);
      setActiveBatchId(null);

      try {
        let finalReferenceUrl: string | undefined;

        if (config.referenceImage instanceof File) {
          finalReferenceUrl = await uploadFileToImageKit(
            config.referenceImage,
            user?.id,
          );
        }

        // Strip frontend-only fields, only send what the API expects
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { referenceImage, referenceImagePreview, ...cleanConfig } =
          config;

        const apiPayload: GenerateApiRequest = {
          prompt: activePrompt,
          config: {
            ...cleanConfig,
            canvasMode: "edit",
            ...(finalReferenceUrl && { referenceImageUrl: finalReferenceUrl }),
          },
        };

        const response = await mutateAsync(apiPayload);

        if (response?.batchId) {
          setActiveBatchId(response.batchId);
        }
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "Failed to start generation",
        );
        setStatus("error");
      }
    },
    [prompt, status, isPending, config, mutateAsync, user],
  );

  const handleRetry = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleReset = useCallback(() => {
    setPrompt("");
    setConfig(DEFAULT_CONFIG);
    setStatus("idle");
    setLocalError(null);
    setResults([]);
    setActiveBatchId(null);
  }, []);

  return {
    prompt,
    setPrompt,
    config,
    updateConfig,
    handleReferenceImage,
    status,
    results,
    error: localError,
    isGenerating: status === "generating" || status === "polling" || isPending,
    creditCost,
    canGenerate,
    handleGenerate,
    handleRetry,
    handleReset,
    mobileConfigOpen,
    setMobileConfigOpen,
    batchData, // Expose raw batch data if display component needs it for progressive loading
  };
}
