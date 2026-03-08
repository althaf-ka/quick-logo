import { useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import type { EditApiRequest } from "@quicklogo/shared";

export interface EditHistoryEntry {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

type EditStatus = "idle" | "generating" | "polling" | "done" | "error";

const DEFAULT_MODEL = "quick-remix";
const REFERENCE_STRENGTH = 35;

export function useEditForm({
  imageId,
  initialImageUrl,
  initialPrompt,
}: {
  imageId: string;
  initialImageUrl?: string;
  initialPrompt?: string;
}) {
  const queryClient = useQueryClient();

  const { data: fetchResult, isPending: isFetchingHistory } = useQuery({
    queryKey: ["image-history", imageId],
    queryFn: async () => {
      const res = await api.images[":id"].$get({ param: { id: imageId } });
      if (!res.ok) {
        throw new Error("Failed to fetch image details");
      }
      return res.json();
    },
  });

  const sourceImageUrl = initialImageUrl ?? fetchResult?.image?.imageUrl ?? "";
  const sourcePrompt = initialPrompt ?? fetchResult?.image?.prompt ?? "";

  const [prompt, setPrompt] = useState(initialPrompt ?? "");

  const [, setHasInitializedPrompt] = useState(false);
  const fetchedPrompt = fetchResult?.image?.prompt;

  if (!initialPrompt && fetchedPrompt) {
    setHasInitializedPrompt((prev) => {
      if (!prev) {
        setPrompt(fetchedPrompt);
        return true;
      }
      return prev;
    });
  }

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [activeEditImageId, setActiveEditImageId] = useState<string | null>(
    () => {
      const pendingNode = fetchResult?.history?.find(
        (h) => h.status === "pending" || h.status === "processing",
      );
      return pendingNode ? pendingNode.id : null;
    },
  );

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const serverHistory = useMemo(() => {
    if (!fetchResult?.history) return [];
    return fetchResult.history
      .filter((h) => h.imageUrl)
      .map((h) => ({
        id: h.id,
        url: h.imageUrl!,
        prompt: h.prompt,
        createdAt: new Date(h.createdAt),
      }));
  }, [fetchResult]);

  const history = useMemo(() => {
    if (serverHistory.length === 0) {
      if (!sourceImageUrl) return [];
      return [
        {
          id: imageId, // temporary until fetched
          url: sourceImageUrl,
          prompt: sourcePrompt || "Original",
          createdAt: fetchResult?.image?.createdAt
            ? new Date(fetchResult.image.createdAt)
            : new Date(),
        },
      ];
    }

    return [...serverHistory].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [serverHistory, sourceImageUrl, sourcePrompt, fetchResult, imageId]);

  const selectedEntry = useMemo(() => {
    if (selectedEntryId) {
      return history.find((h) => h.id === selectedEntryId) || null;
    }
    return history[0] ?? null;
  }, [history, selectedEntryId]);

  const setSelectedEntry = useCallback((entry: EditHistoryEntry | null) => {
    setSelectedEntryId(entry?.id ?? null);
  }, []);

  const { data: pollingData, isError: isPollingError } = useQuery({
    queryKey: ["image-status", activeEditImageId],
    queryFn: async () => {
      const res = await api.images[":id"].$get({
        param: { id: activeEditImageId! },
      });
      if (!res.ok) throw new Error("Failed to fetch image status");
      return res.json();
    },
    enabled: !!activeEditImageId,
    refetchInterval: (query) => {
      const status = query.state.data?.image?.status;
      return status === "completed" || status === "failed" ? false : 5000;
    },
  });

  useEffect(() => {
    if (!activeEditImageId || !pollingData || isPollingError) return;

    const polledImage = pollingData.image;
    if (!polledImage) return;

    if (polledImage.status === "completed" && polledImage.imageUrl) {
      const entry: EditHistoryEntry = {
        id: polledImage.id,
        url: polledImage.imageUrl,
        prompt: polledImage.prompt,
        createdAt: new Date(),
      };

      // Update cache so UI updates immediately without needing localHistory state
      queryClient.setQueryData(["image-history", imageId], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const oldData = old as { history?: unknown[] };
        if (!Array.isArray(oldData.history)) return oldData;

        return {
          ...oldData,
          history: [
            {
              id: entry.id,
              imageUrl: entry.url,
              prompt: entry.prompt,
              createdAt: entry.createdAt.toISOString(),
            },
            ...oldData.history.filter(
              (h: unknown) => (h as { id: string })?.id !== entry.id,
            ),
          ],
        };
      });

      // Break synchronous cascade
      setTimeout(() => {
        setSelectedEntryId(entry.id);
        setActiveEditImageId(null);
      }, 0);

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["image-history", imageId] });
    } else if (polledImage.status === "failed") {
      setTimeout(() => {
        setErrorState("Edit failed during generation.");
        setActiveEditImageId(null);
      }, 0);
    }
  }, [pollingData, isPollingError, activeEditImageId, queryClient, imageId]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: EditApiRequest) => {
      const res = await api.generate.edit.$post({ json: data });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Edit failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "credits"] });
    },
    onError: (err) => {
      toast.error("Edit failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const isPolling = activeEditImageId !== null && !isPollingError;
  const isEditing = isPending || isPolling;

  const error =
    activeEditImageId && isPollingError
      ? "Failed to fetch edit status."
      : errorState;
  const status: EditStatus = error
    ? "error"
    : isPending
      ? "generating"
      : isPolling
        ? "polling"
        : "idle";

  const handleEdit = useCallback(async () => {
    const targetImageUrl = selectedEntry?.url ?? sourceImageUrl;
    const targetImageId = selectedEntry?.id ?? imageId;

    if (!prompt.trim() || isEditing || !targetImageUrl) return;

    setErrorState(null);

    try {
      const payload: EditApiRequest = {
        prompt,
        sourceImageId: targetImageId,
        config: {
          model,
          imageCount: 1,
          style: "",
          colorPalette: "auto",
          background: "transparent",
          customBgColor: "#ffffff",
          referenceImageUrl: targetImageUrl,
          referenceStrength: REFERENCE_STRENGTH,
          magicPrompt: false,
        },
      };

      const response = await mutateAsync(payload);
      if (response?.imageId) setActiveEditImageId(response.imageId);
    } catch (err) {
      setErrorState(
        err instanceof Error ? err.message : "Failed to start edit",
      );
    }
  }, [
    prompt,
    model,
    sourceImageUrl,
    imageId,
    isEditing,
    mutateAsync,
    selectedEntry?.id,
    selectedEntry?.url,
  ]);

  return {
    prompt,
    setPrompt,
    model,
    setModel,
    status,
    error,
    isEditing,
    history,
    selectedEntry,
    setSelectedEntry,
    handleEdit,
    sourceImageUrl,
    sourcePrompt,
    isFetchingHistory,
    isHistoryBootstrapping: isFetchingHistory && serverHistory.length === 0,
    isMissingData: isFetchingHistory && !fetchResult,
  };
}
