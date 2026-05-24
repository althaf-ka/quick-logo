import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import type { NormalizedBrandKit } from "../../types/brand-kit";

interface UseBrandKitRefinementOptions {
  brandKitId: string | null;
  typographyStyle?: string;
}

export interface CreativeSessionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface RefinementHistoryEntry {
  assetId: string;
  prompt: string;
  timestamp: string;
}

export function useBrandKitRefinement({
  brandKitId,
  typographyStyle,
}: UseBrandKitRefinementOptions) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [targetSection, setTargetSection] = useState<string | null>(null);
  const [refiningSectionId, setRefiningSectionId] = useState<string | null>(
    null,
  );

  // Conversational session memory
  const [conversationHistory, setConversationHistory] = useState<
    CreativeSessionMessage[]
  >([]);
  const [refinementHistory, setRefinementHistory] = useState<
    RefinementHistoryEntry[]
  >([]);

  const hydrateFromBrandKit = useCallback((normalized: NormalizedBrandKit) => {
    // Populate session memory from normalized revisions if available
    const historyEntries: RefinementHistoryEntry[] = normalized.revisions
      .filter((r) => r.triggerType.startsWith("refine_"))
      .map((r) => ({
        assetId: r.triggerType.replace("refine_", ""),
        prompt: (r.results as any)?.lastPrompt || "",
        timestamp: r.createdAt,
      }));
    setRefinementHistory(historyEntries);
  }, []);

  const { mutate: mutateRefine, isPending: isRefiningKit } = useMutation({
    mutationFn: async ({
      sectionId,
      refinementPrompt,
    }: {
      sectionId: string;
      refinementPrompt: string;
    }) => {
      if (!brandKitId) throw new Error("No active brand kit session");
      const res = await api.brandKits[":id"].refine.$post({
        param: { id: brandKitId },
        json: {
          sectionId: sectionId as any,
          refinementPrompt,
          typographyStyle,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        let errorMessage = errData?.error || "Failed to refine";
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
    onMutate: ({ sectionId, refinementPrompt }) => {
      if (!refinementPrompt.startsWith("__FONT_OVERRIDE__")) {
        setRefiningSectionId(sectionId);
      }
    },
    onSuccess: (_, variables) => {
      // Font overrides skip general refetches to avoid visual jumps
      if (variables.refinementPrompt.startsWith("__FONT_OVERRIDE__")) return;
      queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });

      // Update local conversation history
      setConversationHistory((prev) => [
        ...prev,
        {
          role: "user",
          content: variables.refinementPrompt,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant",
          content: `Refinement applied successfully to the ${variables.sectionId} deliverable.`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setPrompt("");
      setTargetSection(null);
    },
    onError: (err: Error, variables) => {
      if (variables.refinementPrompt.startsWith("__FONT_OVERRIDE__")) {
        queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
      }
      setRefiningSectionId(null);
      toast.error(err.message || "Failed to start refinement");
    },
    onSettled: () => {
      setRefiningSectionId(null);
    },
  });

  const { mutate: mutateRestore, isPending: isRestoringKit } = useMutation({
    mutationFn: async ({
      sectionId,
      sourceRevisionId,
    }: {
      sectionId: string;
      sourceRevisionId: string;
    }) => {
      if (!brandKitId) throw new Error("No active brand kit session");
      const res = await api.brandKits[":id"]["restore-section"].$post({
        param: { id: brandKitId },
        json: {
          sectionId: sectionId as any,
          sourceRevisionId,
        },
      });
      if (!res.ok) throw new Error("Failed to restore revision");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
      toast.success("Section restored!");
    },
    onError: () => {
      toast.error("Failed to restore section");
    },
  });

  return {
    prompt,
    setPrompt,
    targetSection,
    setTargetSection,
    refiningSectionId,
    setRefiningSectionId,
    conversationHistory,
    refinementHistory,
    mutateRefine,
    isRefiningKit,
    mutateRestore,
    isRestoringKit,
    hydrateFromBrandKit,
  };
}
export type UseBrandKitRefinementReturn = ReturnType<
  typeof useBrandKitRefinement
>;
