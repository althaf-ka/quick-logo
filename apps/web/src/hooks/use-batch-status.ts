import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InferResponseType } from "@quicklogo/api-client";

type BatchResponse = InferResponseType<
  (typeof api.batches)[":batchId"]["$get"],
  200
>;

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
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === "processing" ? 15000 : false;
    },
  });
}
