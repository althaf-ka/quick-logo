import { useInfiniteQuery } from "@tanstack/react-query";
import type { InferResponseType } from "@quicklogo/api-client";
import { api } from "@/lib/api-client";

export type BrandKitItem = InferResponseType<
  typeof api.brandKits.index.$get,
  200
>["items"][number];

export function useBrandKits() {
  return useInfiniteQuery({
    queryKey: ["brand-kits"],
    queryFn: async ({ pageParam }) => {
      const res = await api.brandKits.index.$get({
        query: {
          cursor: (pageParam as string) || undefined,
          limit: "12",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch brand kits");
      }

      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
