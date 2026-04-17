import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { InferResponseType } from "@quicklogo/api-client";

export const ADMIN_KEYS = {
  dashboard: ["admin", "dashboard"] as const,
  users: ["admin", "users"] as const,
  transactions: (page: number) => ["admin", "transactions", { page }] as const,
  logs: (filters: LogFilters) => ["admin", "logs", filters] as const,
};

export type DashboardData = InferResponseType<
  (typeof api.admin.dashboard)["$get"],
  200
>;

export type AdminTransactionsResponse = InferResponseType<
  (typeof api.admin.transactions)["$get"],
  200
>;

export type AdminLogsResponse = InferResponseType<
  (typeof api.admin.logs)["$get"],
  200
>;

export type AdminLog = AdminLogsResponse["items"][number];

export type LogFilters = {
  level?: string;
  source?: string;
};

export function useAdminDashboard() {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard,
    queryFn: async () => {
      const res = await api.admin.dashboard.$get();
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return await res.json();
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Infinite query for users using Better Auth Admin Plugin
 */
export function useInfiniteAdminUsers(
  searchValue = "",
  searchField: "email" | "name" = "email",
) {
  return useInfiniteQuery({
    queryKey: [...ADMIN_KEYS.users, { searchValue, searchField }],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit: 20,
          offset: pageParam,
          searchValue: searchValue || undefined,
          searchField: searchValue ? searchField : undefined,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      if (error) throw new Error(error.message || "Failed to fetch users");
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !("offset" in lastPage) || !("limit" in lastPage))
        return undefined;
      const nextOffset = (lastPage.offset ?? 0) + (lastPage.limit ?? 20);
      return nextOffset < (lastPage.total ?? 0) ? nextOffset : undefined;
    },
  });
}

/**
 * Admin Actions Mutations
 */
export function useAdminActions() {
  const queryClient = useQueryClient();

  const banUser = useMutation({
    mutationFn: async ({
      userId,
      reason,
      expiresIn,
    }: {
      userId: string;
      reason?: string;
      expiresIn?: number;
    }) => {
      const { error } = await authClient.admin.banUser({
        userId,
        banReason: reason,
        banExpiresIn: expiresIn,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users }),
  });

  const unbanUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.unbanUser({ userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users }),
  });

  const setRole = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "user" | "admin";
    }) => {
      const { error } = await authClient.admin.setRole({ userId, role });
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users }),
  });

  const impersonateUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.impersonateUser({ userId });
      if (error) throw new Error(error.message);
    },
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.removeUser({ userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users }),
  });

  return { banUser, unbanUser, setRole, impersonateUser, removeUser };
}

export function useAdminTransactions(page = 1) {
  return useQuery({
    queryKey: ADMIN_KEYS.transactions(page),
    queryFn: async () => {
      const res = await api.admin.transactions.$get({
        query: { page: String(page) },
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return await res.json();
    },
    staleTime: 30 * 1000,
  });
}
export function useInfiniteAdminTransactions() {
  return useInfiniteQuery({
    queryKey: ["admin", "transactions", "infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.admin.transactions.$get({
        query: { page: String(pageParam) },
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return await res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(
        (lastPage?.metadata?.total ?? 0) / (lastPage?.metadata?.limit ?? 50),
      );
      const currentPage = lastPage?.metadata?.page ?? 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });
}

export function useInfiniteAdminLogs(filters: LogFilters = {}) {
  return useInfiniteQuery({
    queryKey: ADMIN_KEYS.logs(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.admin.logs.$get({
        query: {
          page: String(pageParam),
          level: filters.level || undefined,
          source: filters.source || undefined,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return await res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(
        (lastPage?.metadata?.total ?? 0) / (lastPage?.metadata?.limit ?? 50),
      );
      const currentPage = lastPage?.metadata?.page ?? 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });
}

export function useLogActions() {
  const queryClient = useQueryClient();

  const resolveLog = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - Hono RPC nested route type complexity
      const res = await api.admin.logs[":id"].$patch({
        param: { id },
        json: { status: "resolved" },
      });
      if (!res.ok) throw new Error("Failed to resolve log");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "logs"] }),
  });

  const ignoreLog = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - Hono RPC nested route type complexity
      const res = await api.admin.logs[":id"].$patch({
        param: { id },
        json: { status: "ignored" },
      });
      if (!res.ok) throw new Error("Failed to ignore log");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "logs"] }),
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - Hono RPC nested route type complexity
      const res = await api.admin.logs[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to delete log");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "logs"] }),
  });

  return { resolveLog, ignoreLog, deleteLog };
}
