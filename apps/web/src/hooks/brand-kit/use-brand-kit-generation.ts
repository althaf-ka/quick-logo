import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { normalizeBrandKit } from "../../lib/brand-kit/transformers/normalize-brand-kit";
import { toast } from "@quicklogo/ui/components/sonner";
import type { NormalizedBrandKit } from "../../types/brand-kit";
import type { z } from "zod";
import type { generateBrandKitSchema } from "@quicklogo/shared";

export type GeneratePayload = z.infer<typeof generateBrandKitSchema>;

const BRAND_KIT_POLL_INTERVAL_MS = 2500;

interface UseBrandKitGenerationOptions {
  brandKitId?: string;
  onGenerationSuccess?: (brandKitId: string) => void;
}

export function useBrandKitGeneration({
  brandKitId: initialBrandKitId,
  onGenerationSuccess,
}: UseBrandKitGenerationOptions) {
  const [brandKitId, setBrandKitId] = useState<string | null>(
    initialBrandKitId || null,
  );

  const {
    data: normalizedData,
    isLoading: isQueryLoading,
    error,
  } = useQuery<NormalizedBrandKit | null, Error>({
    queryKey: ["brand-kit", brandKitId],
    queryFn: async () => {
      if (!brandKitId) return null;
      const res = await api.brandKits[":id"].$get({
        param: { id: brandKitId },
      });
      if (!res.ok) throw new Error("Failed to fetch Brand Kit");
      const raw = await res.json();
      return normalizeBrandKit(raw);
    },
    staleTime: BRAND_KIT_POLL_INTERVAL_MS,
    refetchInterval: (query) => {
      const data = query.state.data as NormalizedBrandKit | null;
      const status = data?.status;
      if (status === "pending" || status === "processing") {
        return BRAND_KIT_POLL_INTERVAL_MS;
      }
      return false;
    },
    enabled: !!brandKitId,
  });

  const { mutate: mutateGenerate, isPending: isGeneratingKit } = useMutation({
    mutationFn: async (payload: GeneratePayload) => {
      const res = await api.brandKits.index.$post({
        json: payload,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        let errorMessage = errData?.error || "Failed to generate";
        const errJson = errData as Record<string, unknown>;
        if (
          errJson?.issues &&
          Array.isArray(errJson.issues) &&
          errJson.issues.length > 0
        ) {
          errorMessage = (errJson.issues[0] as { message: string }).message;
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setBrandKitId(data.brandKitId);
      if (onGenerationSuccess) {
        onGenerationSuccess(data.brandKitId);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start generation");
    },
  });

  return {
    brandKitId,
    setBrandKitId,
    normalizedData,
    isQueryLoading,
    error,
    mutateGenerate,
    isGeneratingKit,
  };
}
export type UseBrandKitGenerationReturn = ReturnType<
  typeof useBrandKitGeneration
>;
