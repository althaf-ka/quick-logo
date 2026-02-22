import { useState, useCallback, useMemo } from "react";
import {
  type GenerateConfig,
  type GenerationStatus,
  type GeneratedLogo,
  DEFAULT_CONFIG,
  MODELS,
} from "@/types/generate";

export function useGenerateForm() {
  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<GenerateConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [results, setResults] = useState<GeneratedLogo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);

  const updateConfig = useCallback(
    <K extends keyof GenerateConfig>(key: K, value: GenerateConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Handle reference image upload with preview generation
  const handleReferenceImage = useCallback((file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setConfig((prev) => ({
          ...prev,
          referenceImage: file,
          referenceImagePreview: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setConfig((prev) => ({
        ...prev,
        referenceImage: null,
        referenceImagePreview: null,
      }));
    }
  }, []);

  const selectedModel = useMemo(
    () => MODELS.find((m) => m.id === config.model) ?? MODELS[0],
    [config.model]
  );

  const creditCost = useMemo(
    () => selectedModel.credits * config.imageCount,
    [selectedModel, config.imageCount]
  );

  const canGenerate = prompt.trim().length > 0 && status !== "generating";

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setStatus("generating");
    setError(null);

    try {
      // TODO: Replace with actual API POST request
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const placeholderResults: GeneratedLogo[] = Array.from(
        { length: config.imageCount },
        (_, i) => ({
          id: `${Date.now()}-${i}`,
          url: `/api/placeholder/${300 + i}/${300 + i}`,
          prompt,
          config: { ...config },
          createdAt: new Date(),
        })
      );

      setResults(placeholderResults);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStatus("error");
    }
  }, [canGenerate, prompt, config]);

  const handleRetry = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleReset = useCallback(() => {
    setResults([]);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    prompt,
    setPrompt,
    config,
    updateConfig,
    handleReferenceImage,
    status,
    results,
    error,
    creditCost,
    canGenerate,
    handleGenerate,
    handleRetry,
    handleReset,
    mobileConfigOpen,
    setMobileConfigOpen,
  };
}
