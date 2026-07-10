import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import type { NormalizedBrandKit } from "../../types/brand-kit";
import type { RefinementSectionId, RestoreSectionId } from "@quicklogo/shared";

interface UseBrandKitRefinementOptions {
  brandKitId: string | null;
  typographyStyle?: string;
}

const REFINEMENT_POLL_TIMEOUT_MS = 30 * 60 * 1000;
const REFINEMENT_POLL_INTERVAL_MS = 4000;

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
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [activeRevTracker, setActiveRevTracker] = useState<{
    id?: string;
    count: number;
  } | null>(null);

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
        prompt: (r.results as { lastPrompt?: string })?.lastPrompt || "",
        timestamp: r.createdAt,
      }));
    setRefinementHistory(historyEntries);
  }, []);

  const { mutate: mutateRefine, isPending: isRefiningKit } = useMutation({
    mutationFn: async ({
      sectionId,
      refinementPrompt,
      targetItemId: mutationTargetItemId,
    }: {
      sectionId: RefinementSectionId;
      refinementPrompt: string;
      targetItemId?: string;
    }) => {
      if (!brandKitId) throw new Error("No active brand kit session");
      const res = await api.brandKits[":id"].refine.$post({
        param: { id: brandKitId },
        json: {
          sectionId,
          refinementPrompt,
          typographyStyle,
          targetItemId: mutationTargetItemId,
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
    onMutate: ({
      sectionId,
      refinementPrompt,
      targetItemId: mutationTargetItemId,
    }) => {
      const cached = queryClient.getQueryData<NormalizedBrandKit | null>([
        "brand-kit",
        brandKitId,
      ]);
      const activeRev = cached?.revisions.find((r) => r.isActive);

      if (!refinementPrompt.startsWith("__FONT_OVERRIDE__")) {
        setRefiningSectionId(sectionId);
        setTargetItemId(mutationTargetItemId || null);
        setActiveRevTracker({
          id: activeRev?.id,
          count: cached?.revisions.length || 0,
        });
      }
      return { previousActiveRevisionId: activeRev?.id };
    },
    onSuccess: (_, variables, context) => {
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
          content: `Refinement started successfully for the ${variables.sectionId} deliverable.`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setPrompt("");
      setTargetSection(null);

      const prevRevId = context?.previousActiveRevisionId;
      if (prevRevId) {
        toast.success("Refinement started. Changes will appear shortly.", {
          action: {
            label: "Undo Previous",
            onClick: () => mutateRestoreFull({ sourceRevisionId: prevRevId }),
          },
        });
      } else {
        toast.success("Refinement started. Changes will appear shortly.");
      }
    },
    onError: (err: Error, variables) => {
      if (variables.refinementPrompt.startsWith("__FONT_OVERRIDE__")) {
        queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
      }
      setRefiningSectionId(null);
      setTargetItemId(null);
      setActiveRevTracker(null);
      toast.error(err.message || "Failed to start refinement");
    },
    // Removed onSettled clear to allow polling to dictate completion
  });

  useEffect(() => {
    if (!refiningSectionId || !brandKitId || !activeRevTracker) return;

    // Queue retries can legitimately outlive one model call. Stop the local
    // spinner eventually without implying that the background job was killed.
    const timeout = setTimeout(() => {
      setRefiningSectionId(null);
      setTargetItemId(null);
      setActiveRevTracker(null);
      toast.info(
        "This refinement is taking longer than expected and will continue in the background.",
        { id: "refine-timeout" },
      );
    }, REFINEMENT_POLL_TIMEOUT_MS);

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });

      const cached = queryClient.getQueryData<NormalizedBrandKit | null>([
        "brand-kit",
        brandKitId,
      ]);
      if (cached) {
        const currentActiveId = cached.revisions.find((r) => r.isActive)?.id;
        const currentCount = cached.revisions.length;

        if (
          (currentActiveId && currentActiveId !== activeRevTracker.id) ||
          currentCount > activeRevTracker.count
        ) {
          setRefiningSectionId(null);
          setTargetItemId(null);
          setActiveRevTracker(null);
        }
      }
    }, REFINEMENT_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [refiningSectionId, brandKitId, activeRevTracker, queryClient]);

  const { mutate: mutateRestore, isPending: isRestoringKit } = useMutation({
    mutationFn: async ({
      sectionId,
      sourceRevisionId,
    }: {
      sectionId: RestoreSectionId;
      sourceRevisionId: string;
    }) => {
      if (!brandKitId) throw new Error("No active brand kit session");
      const res = await api.brandKits[":id"]["restore-section"].$post({
        param: { id: brandKitId },
        json: {
          sectionId,
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

  const { mutate: mutateRestoreFull, isPending: isRestoringFull } = useMutation(
    {
      mutationFn: async ({
        sourceRevisionId,
      }: {
        sourceRevisionId: string;
      }) => {
        if (!brandKitId) throw new Error("No active brand kit session");
        const res = await api.brandKits[":id"]["restore-full"].$post({
          param: { id: brandKitId },
          json: {
            sourceRevisionId,
          },
        });
        if (!res.ok) throw new Error("Failed to restore revision");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
        toast.success("Brand Kit restored to previous version!");
      },
      onError: () => {
        toast.error("Failed to restore Brand Kit");
      },
    },
  );

  return {
    prompt,
    setPrompt,
    targetSection,
    setTargetSection,
    refiningSectionId,
    setRefiningSectionId,
    targetItemId,
    setTargetItemId,
    conversationHistory,
    refinementHistory,
    mutateRefine,
    isRefiningKit,
    mutateRestore,
    isRestoringKit,
    mutateRestoreFull,
    isRestoringFull,
    hydrateFromBrandKit,
  };
}
export type UseBrandKitRefinementReturn = ReturnType<
  typeof useBrandKitRefinement
>;
