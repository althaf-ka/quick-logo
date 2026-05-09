import { useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@quicklogo/ui/components/sonner";
import type { EditApiRequest } from "@quicklogo/shared";
import { AUTH_KEYS } from "@/hooks/use-auth";
import { parseApiError, ApiError, ERROR_CODES } from "@/lib/api-error";

export interface EditHistoryEntry {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

type EditStatus = "idle" | "generating" | "polling" | "done" | "error";

const DEFAULT_MODEL = "quick-seedream";
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
      if (!res.ok) throw new Error("Failed to fetch image details");
      return res.json();
    },
  });

  const sourceImageUrl = initialImageUrl ?? fetchResult?.image?.imageUrl ?? "";
  const sourcePrompt = initialPrompt ?? fetchResult?.image?.prompt ?? "";

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [manualActiveId, setManualActiveId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // The active ID is either local optimistic state or a pending server edit.
  const activeEditImageId = useMemo(() => {
    if (manualActiveId) return manualActiveId;

    return fetchResult?.history?.find(
      (h) => h.status === "pending" || h.status === "processing",
    )?.id ?? null;
  }, [manualActiveId, fetchResult?.history]);

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
          id: imageId,
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
      return history.find((h) => h.id === selectedEntryId) ?? null;
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
      return status === "completed" || status === "failed" ? false : 15000;
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

      setTimeout(() => {
        setSelectedEntryId(entry.id);
        setManualActiveId(null);
      }, 0);

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["image-history", imageId] });
    } else if (polledImage.status === "failed") {
      setTimeout(() => {
        setErrorState("Edit failed during generation.");
        setManualActiveId(null);
      }, 0);
      queryClient.invalidateQueries({ queryKey: ["image-history", imageId] });
    }
  }, [pollingData, isPollingError, activeEditImageId, queryClient, imageId]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: EditApiRequest) => {
      const res = await api.generate.edit.$post({ json: data });
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
      queryClient.invalidateQueries({
        queryKey: ["image-status", data.imageId],
      });
      queryClient.invalidateQueries({ queryKey: ["image-history", imageId] });
      setManualActiveId(data.imageId);
      setPrompt("");
    },
    onError: (err) => {
      if (
        err instanceof ApiError &&
        err.code === ERROR_CODES.INSUFFICIENT_CREDITS
      ) {
        toast.error("Not enough credits", { description: err.message });
        return;
      }
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
      const fetchedBrandName = (fetchResult?.image as Record<string, unknown>)
        ?.brandName;
      const brandName =
        typeof fetchedBrandName === "string" ? fetchedBrandName : "";

      const payload: EditApiRequest = {
        prompt,
        sourceImageId: targetImageId,
        config: {
          model,
          brandName,
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
      if (response?.imageId) setManualActiveId(response.imageId);
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
    fetchResult?.image,
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
