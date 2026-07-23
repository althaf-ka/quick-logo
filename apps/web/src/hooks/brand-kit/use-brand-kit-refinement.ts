import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AUTH_KEYS } from "@/hooks/use-auth";
import { toast } from "@quicklogo/ui/components/sonner";
import type { NormalizedBrandKit } from "../../types/brand-kit";
import type { RefinementSectionId, RestoreSectionId } from "@quicklogo/shared";

interface UseBrandKitRefinementOptions {
  brandKitId: string | null;
  typographyStyle?: string;
  activeRefinement?: NormalizedBrandKit["activeRefinement"];
  baseRevisionId?: string;
  expectedActiveRevisionId?: string;
  onRevisionCreated?: () => void;
}

type DeterministicEditInput =
  | {
      action: "set-font";
      role: "heading" | "body";
      family: string;
    }
  | {
      action: "set-palette";
      colors: Array<{ hex: string; role: string }>;
    };

const REFINEMENT_POLL_INTERVAL_MS = 4000;

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") return fallback;
  const error = (data as { error?: unknown }).error;
  if (typeof error === "string") return error;
  const issues = (data as { issues?: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return fallback;
  const message = (issues[0] as { message?: unknown }).message;
  return typeof message === "string" ? message : fallback;
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
  activeRefinement,
  baseRevisionId,
  expectedActiveRevisionId,
  onRevisionCreated,
}: UseBrandKitRefinementOptions) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [targetSection, setTargetSection] = useState<string | null>(null);
  const [refiningSectionId, setRefiningSectionId] = useState<string | null>(
    null,
  );
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [activeRefinementId, setActiveRefinementId] = useState<string | null>(
    null,
  );
  const hydratedRefinementId = useRef<string | null>(null);
  const handledRefinementId = useRef<string | null>(null);

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
      .filter((r) => r.revisionType === "refinement")
      .map((r) => ({
        assetId: r.targetItemId
          ? `${r.sectionId}:${r.targetItemId}`
          : (r.sectionId ?? "brand-kit"),
        prompt: r.refinementPrompt || "",
        timestamp: r.createdAt,
      }));
    setRefinementHistory(historyEntries);
  }, []);

  useEffect(() => {
    if (
      activeRefinement &&
      hydratedRefinementId.current !== activeRefinement.id
    ) {
      hydratedRefinementId.current = activeRefinement.id;
      setActiveRefinementId(activeRefinement.id);
      setRefiningSectionId(activeRefinement.sectionId);
      setTargetItemId(activeRefinement.targetItemId || null);
    }
  }, [activeRefinement]);

  const { data: refinementOperation } = useQuery({
    queryKey: ["brand-kit-refinement", brandKitId, activeRefinementId],
    queryFn: async () => {
      if (!brandKitId || !activeRefinementId) return null;
      const response = await api.brandKits[":id"].refinements[
        ":refinementId"
      ].$get({
        param: { id: brandKitId, refinementId: activeRefinementId },
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to check refinement status"),
        );
      }
      return response.json();
    },
    enabled: Boolean(brandKitId && activeRefinementId),
    staleTime: REFINEMENT_POLL_INTERVAL_MS,
    refetchInterval: (query) => {
      const status = query.state.data?.refinement.status;
      return status === "queued" || status === "processing"
        ? REFINEMENT_POLL_INTERVAL_MS
        : false;
    },
  });

  const { mutate: mutateRefine, isPending: isSubmittingRefinement } =
    useMutation({
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
        if (!baseRevisionId || !expectedActiveRevisionId) {
          throw new Error("No Brand Kit revision is available to refine");
        }
        const res = await api.brandKits[":id"].refine.$post({
          param: { id: brandKitId },
          json: {
            sectionId,
            baseRevisionId,
            expectedActiveRevisionId,
            refinementPrompt,
            typographyStyle,
            targetItemId: mutationTargetItemId,
          },
        });
        if (!res.ok) {
          throw new Error(await readErrorMessage(res, "Failed to refine"));
        }
        return res.json();
      },
      onMutate: ({ sectionId, targetItemId: mutationTargetItemId }) => {
        setRefiningSectionId(sectionId);
        setTargetItemId(mutationTargetItemId || null);
      },
      onSuccess: (data, variables) => {
        hydratedRefinementId.current = data.refinementId;
        setActiveRefinementId(data.refinementId);
        void queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });

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
            content: `Refinement queued for the ${variables.sectionId} deliverable.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setPrompt("");
        setTargetSection(null);
        toast.success("Refinement queued. Changes will appear shortly.");
      },
      onError: (err: Error) => {
        setRefiningSectionId(null);
        setTargetItemId(null);
        void queryClient.invalidateQueries({
          queryKey: ["brand-kit", brandKitId],
        });
        void queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
        toast.error(err.message || "Failed to start refinement");
      },
    });

  const { mutate: mutateEdit, isPending: isSavingEdit } = useMutation({
    mutationFn: async (edit: DeterministicEditInput) => {
      if (!brandKitId) throw new Error("No active brand kit session");
      if (!baseRevisionId || !expectedActiveRevisionId) {
        throw new Error("No Brand Kit revision is available to edit");
      }

      const response = await api.brandKits[":id"].edit.$post({
        param: { id: brandKitId },
        json: { ...edit, baseRevisionId, expectedActiveRevisionId },
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to save brand kit edit"),
        );
      }
      return response.json();
    },
    onMutate: async (edit) => {
      const queryKey = ["brand-kit", brandKitId] as const;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NormalizedBrandKit | null>(
        queryKey,
      );

      queryClient.setQueryData<NormalizedBrandKit | null>(
        queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            revisions: current.revisions.map((revision) => {
              if (revision.id !== baseRevisionId) return revision;
              const results = revision.results;
              if (edit.action === "set-palette") {
                return {
                  ...revision,
                  results: { ...results, colorPalette: edit.colors },
                };
              }

              const typography = results.typography as
                | Record<"heading" | "body", Record<string, unknown>>
                | undefined;
              if (!typography?.[edit.role]) return revision;
              return {
                ...revision,
                results: {
                  ...results,
                  typography: {
                    ...typography,
                    [edit.role]: {
                      ...typography[edit.role],
                      family: edit.family,
                      name: edit.family,
                    },
                  },
                },
              };
            }),
          };
        },
      );

      return { previous };
    },
    onSuccess: (data, edit) => {
      if (data.status === "unchanged") {
        toast.info("No changes to save.");
        return;
      }
      toast.success(
        edit.action === "set-font" ? "Font updated." : "Palette updated.",
      );
    },
    onError: (error: Error, _edit, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["brand-kit", brandKitId], context.previous);
      }
      toast.error(error.message || "Failed to save brand kit edit");
    },
    onSettled: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: ["brand-kit", brandKitId],
      });
      if (data?.status === "updated") onRevisionCreated?.();
    },
  });

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
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to restore revision"),
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
      toast.success("Section restored!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore section");
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
        if (!res.ok) {
          throw new Error(
            await readErrorMessage(res, "Failed to restore revision"),
          );
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["brand-kit", brandKitId] });
        toast.success("Brand Kit restored to previous version!");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to restore Brand Kit");
      },
    },
  );

  useEffect(() => {
    const operation = refinementOperation?.refinement;
    if (!operation) return;

    if (operation.status === "queued" || operation.status === "processing") {
      setRefiningSectionId(operation.sectionId);
      setTargetItemId(operation.targetItemId || null);
      return;
    }

    if (handledRefinementId.current === operation.id) return;
    handledRefinementId.current = operation.id;
    setRefiningSectionId(null);
    setTargetItemId(null);
    setActiveRefinementId(null);
    const refreshBrandKit = queryClient.invalidateQueries({
      queryKey: ["brand-kit", brandKitId],
    });
    void queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });

    if (operation.status === "completed") {
      void refreshBrandKit.then(() => onRevisionCreated?.());
      toast.success("Refinement completed.", {
        id: `refinement-${operation.id}`,
        action: {
          label: "Undo",
          onClick: () =>
            mutateRestoreFull({ sourceRevisionId: operation.baseRevisionId }),
        },
      });
      return;
    }

    void refreshBrandKit;
    toast.error(operation.errorMessage || "Refinement failed.", {
      id: `refinement-${operation.id}`,
      description: operation.refundedAt
        ? `${operation.creditsUsed} credits were refunded.`
        : undefined,
    });
  }, [
    brandKitId,
    mutateRestoreFull,
    onRevisionCreated,
    queryClient,
    refinementOperation?.refinement,
  ]);

  const isRefiningKit = isSubmittingRefinement || Boolean(refiningSectionId);

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
    mutateEdit,
    isSavingEdit,
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
