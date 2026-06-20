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
  users: {
    all: ["admin", "users"] as const,
    search: (searchValue: string, searchField: string) =>
      [...ADMIN_KEYS.users.all, { searchValue, searchField }] as const,
  },
  transactions: {
    all: ["admin", "transactions"] as const,
    page: (page: number) => [...ADMIN_KEYS.transactions.all, { page }] as const,
  },
  logs: {
    all: ["admin", "logs"] as const,
    filtered: (filters: LogFilters) =>
      [...ADMIN_KEYS.logs.all, filters] as const,
  },
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
  level?: "info" | "warn" | "error" | "fatal";
  source?: "web" | "admin" | "api" | "worker";
};

export function calculateNextPage(lastPage: {
  metadata?: { total: number; limit: number; page: number };
}) {
  if (!lastPage?.metadata) return undefined;
  const { total, limit, page } = lastPage.metadata;
  const totalPages = Math.ceil(total / limit);
  return page < totalPages ? page + 1 : undefined;
}

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
    queryKey: ADMIN_KEYS.users.search(searchValue, searchField),
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
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.all }),
  });

  const unbanUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.unbanUser({ userId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.all }),
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
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.all }),
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
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.all }),
  });

  return { banUser, unbanUser, setRole, impersonateUser, removeUser };
}

export function useAdminTransactions(page = 1) {
  return useQuery({
    queryKey: ADMIN_KEYS.transactions.page(page),
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
    queryKey: [...ADMIN_KEYS.transactions.all, "infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.admin.transactions.$get({
        query: { page: String(pageParam) },
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return await res.json();
    },
    initialPageParam: 1,
    getNextPageParam: calculateNextPage,
  });
}

export function useInfiniteAdminLogs(filters: LogFilters = {}) {
  return useInfiniteQuery({
    queryKey: ADMIN_KEYS.logs.filtered(filters),
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
    getNextPageParam: calculateNextPage,
  });
}

export function useLogActions() {
  const queryClient = useQueryClient();

  const resolveLog = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.admin.logs[":id"].$patch({
        param: { id },
        json: { status: "resolved" },
      });
      if (!res.ok) throw new Error("Failed to resolve log");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.logs.all }),
  });

  const ignoreLog = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.admin.logs[":id"].$patch({
        param: { id },
        json: { status: "ignored" },
      });
      if (!res.ok) throw new Error("Failed to ignore log");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.logs.all }),
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.admin.logs[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to delete log");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.logs.all }),
  });

  return { resolveLog, ignoreLog, deleteLog };
}
