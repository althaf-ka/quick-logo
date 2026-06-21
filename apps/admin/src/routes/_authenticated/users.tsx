import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteAdminUsers, useAdminActions } from "@/hooks/use-admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@quicklogo/ui/components/table";
import { Badge } from "@quicklogo/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@quicklogo/ui/components/card";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { Input } from "@quicklogo/ui/components/input";
import { Button } from "@quicklogo/ui/components/button";
import { format } from "date-fns";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { User } from "@quicklogo/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@quicklogo/ui/components/dropdown-menu";
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCircleGearIcon,
  UsersIcon,
  UserSwitchIcon,
} from "@phosphor-icons/react";

interface UserWithAdmin extends User {
  role: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: Date | null;
}

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const [searchValue, setSearchValue] = useState("");
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteAdminUsers(searchValue);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allUsers: UserWithAdmin[] =
    data?.pages.flatMap((page) =>
      page && "users" in page ? (page.users as UserWithAdmin[]) : [],
    ) ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="from-primary to-primary/60 bg-linear-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            User Management
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage your platform&apos;s user base.
          </p>
        </div>
        <div className="group relative w-full md:w-80">
          <MagnifyingGlassIcon className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors" />
          <Input
            placeholder="Search users..."
            className="border-muted-foreground/10 bg-muted/40 focus:bg-background h-11 rounded-none pl-10 transition-all"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-muted-foreground/10 bg-muted/5 overflow-hidden rounded-none py-0 shadow-xl backdrop-blur-sm">
        <CardHeader className="border-muted-foreground/10 bg-muted/30 border-b py-3.5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <UsersIcon className="text-primary size-5" />
              Users Directory
              <Badge
                variant="secondary"
                className="ml-2 rounded-none font-mono"
              >
                {data?.pages[0]?.total ?? 0} total
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-muted-foreground/10 hover:bg-transparent">
                <TableHead className="w-20">Av.</TableHead>
                <TableHead className="min-w-50">Identity</TableHead>
                <TableHead>Authorization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Activity</TableHead>
                <TableHead className="w-25 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </TableBody>
          </Table>

          {isLoading && (
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-none" />
              ))}
            </div>
          )}

          {isError && (
            <div className="text-destructive flex flex-col items-center gap-2 p-12 text-center">
              <ProhibitIcon size={32} />
              <p className="font-medium">
                Connectivity interrupted. Could not sync users.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && allUsers.length === 0 && (
            <div className="text-muted-foreground p-12 text-center">
              No users found matching your search.
            </div>
          )}

          <div ref={ref} className="h-px" />
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <Skeleton className="h-8 w-32 rounded-none" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({ user }: { user: UserWithAdmin }) {
  const { banUser, unbanUser, setRole, impersonateUser, removeUser } =
    useAdminActions();
  const [isPending, setIsPending] = useState(false);

  const handleAction = async (
    actionFn: () => Promise<void>,
    successMsg: string,
  ) => {
    setIsPending(true);
    try {
      await actionFn();
      toast.success(successMsg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <TableRow className="border-muted-foreground/10 hover:bg-muted/30 group transition-colors">
      <TableCell>
        <div className="bg-primary/10 text-primary border-primary/20 flex size-8 items-center justify-center rounded-full border text-xs font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold">{user.name}</span>
          <span className="text-muted-foreground font-mono text-xs">
            {user.email}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant={user.role === "admin" ? "default" : "secondary"}
          className="rounded-none text-[10px] font-medium tracking-wider uppercase"
        >
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        {user.banned ? (
          <Badge
            variant="destructive"
            className="flex w-fit items-center gap-1 rounded-none px-2"
          >
            <ProhibitIcon size={12} /> Banned
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="flex w-fit items-center gap-1 rounded-none border-emerald-500/20 bg-emerald-500/5 px-2 text-emerald-500"
          >
            <ShieldCheckIcon size={12} /> Active
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-right text-sm">
        <div className="flex flex-col">
          <span className="text-muted-foreground/60 text-xs font-semibold uppercase">
            Registered on
          </span>
          <span>{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="outline"
              size="sm"
              className="border-muted-foreground/20 hover:bg-primary/10 hover:text-primary flex h-8 items-center gap-2 rounded-none px-2 transition-all"
              disabled={isPending}
            >
              <span className="text-xs font-medium">Manage</span>
              <CaretDownIcon size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-muted-foreground/20 w-56 rounded-none"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Admin Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-muted-foreground/10" />

              <DropdownMenuItem
                className="focus:bg-primary/10 focus:text-primary flex cursor-pointer items-center gap-2 text-sm"
                disabled={user.role === "admin"}
                onClick={() =>
                  handleAction(
                    () => impersonateUser.mutateAsync(user.id),
                    "Impersonating user...",
                  )
                }
              >
                <UserSwitchIcon size={16} />
                <span>Impersonate Account</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="focus:bg-primary/10 focus:text-primary flex cursor-pointer items-center gap-2 text-sm"
                onClick={() =>
                  handleAction(
                    () =>
                      setRole.mutateAsync({
                        userId: user.id,
                        role: user.role === "admin" ? "user" : "admin",
                      }),
                    `User role updated to ${user.role === "admin" ? "user" : "admin"}`,
                  )
                }
              >
                <UserCircleGearIcon size={16} />
                <span>
                  {user.role === "admin"
                    ? "Demote to User"
                    : "Promote to Admin"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-muted-foreground/10" />

            <DropdownMenuGroup>
              {user.banned ? (
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 text-sm text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-500"
                  onClick={() =>
                    handleAction(
                      () => unbanUser.mutateAsync(user.id),
                      "User unbanned",
                    )
                  }
                >
                  <ShieldCheckIcon size={16} />
                  <span>Lift Account Ban</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 text-sm"
                  onClick={() =>
                    handleAction(
                      () => banUser.mutateAsync({ userId: user.id }),
                      "User banned",
                    )
                  }
                >
                  <ProhibitIcon size={16} />
                  <span>Ban User Account</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 text-sm"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to permanently delete this user? This action is irreversible.",
                    )
                  ) {
                    handleAction(
                      () => removeUser.mutateAsync(user.id),
                      "User deleted",
                    );
                  }
                }}
              >
                <TrashIcon size={16} />
                <span>Remove User Profile</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
