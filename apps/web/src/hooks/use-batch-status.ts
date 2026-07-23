import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { InferResponseType } from "@quicklogo/api-client";

type BatchResponse = InferResponseType<
  (typeof api.batches)[":batchId"]["$get"],
  200
>;

const BATCH_POLL_INTERVAL_MS = 15000;

export function useBatchStatus(batchId: string | null) {
  return useQuery({
    queryKey: ["batches", batchId],
    queryFn: async () => {
      if (!batchId) return null;

      const res = await api.batches[":batchId"].$get({
        param: { batchId },
      });

      if (!res.ok) throw new Error("Failed to fetch batch status");
      return (await res.json()) as BatchResponse;
    },
    enabled: !!batchId,
    staleTime: BATCH_POLL_INTERVAL_MS,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === "processing" ? BATCH_POLL_INTERVAL_MS : false;
    },
  });
}
