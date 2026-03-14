import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteAdminLogs, useLogActions } from "@/hooks/use-admin";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@quicklogo/ui/components/dropdown-menu";
import { Button } from "@quicklogo/ui/components/button";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import { format } from "date-fns";
import {
  Pulse,
  Bug,
  ShieldCheck,
  WarningCircle,
  Trash,
  CheckCircle,
  Eye,
  CaretDown,
  Circle,
} from "@phosphor-icons/react";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@quicklogo/ui/components/dialog";

export const Route = createFileRoute("/_authenticated/logs")({
  component: LogsPage,
});

function LogsPage() {
  const [level, setLevel] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteAdminLogs({ level, source });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allLogs = data?.pages.flatMap((page) => page?.items ?? []) ?? [];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Bug className="text-destructive size-12 opacity-50" />
        <div className="text-center">
          <h3 className="text-destructive text-lg font-semibold">
            Failed to Load Logs
          </h3>
          <p className="text-muted-foreground text-sm">
            {(error as any)?.message || "Internal API Error"}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            System Health
          </h2>
          <p className="text-muted-foreground">
            Monitor real-time error telemetry and application logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-none border border-amber-500/20 bg-amber-500/10 p-3">
            <Pulse className="size-6 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          className="border-muted-foreground/20 bg-muted/20 focus:ring-primary h-9 w-[150px] rounded-none border px-3 text-xs focus:ring-1 focus:outline-none"
          onChange={(e) => setLevel(e.target.value || undefined)}
          value={level || ""}
        >
          <option value="">All Levels</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
          <option value="fatal">Fatal</option>
          <option value="info">Info</option>
        </select>

        <select
          className="border-muted-foreground/20 bg-muted/20 focus:ring-primary h-9 w-[150px] rounded-none border px-3 text-xs focus:ring-1 focus:outline-none"
          onChange={(e) => setSource(e.target.value || undefined)}
          value={source || ""}
        >
          <option value="">All Sources</option>
          <option value="web">Main App</option>
          <option value="admin">Admin Portal</option>
          <option value="api">Backend API</option>
        </select>

        <Badge
          variant="outline"
          className="border-muted-foreground/20 h-9 rounded-none font-mono text-[10px]"
        >
          {data?.pages[0]?.metadata?.total ?? 0} LOGS CAPTURED
        </Badge>
      </div>

      <Card className="border-muted-foreground/10 bg-muted/5 overflow-hidden rounded-none shadow-xl backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-muted-foreground/10 border-b py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bug className="size-5 text-amber-500" />
            Incident Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-muted-foreground/10 hover:bg-transparent">
                <TableHead className="w-[100px]">Level</TableHead>
                <TableHead className="w-[100px]">Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLogs.length > 0 ? (
                allLogs.map((log) => <LogRow key={log.id} log={log} />)
              ) : !isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground h-24 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 py-4">
                      <ShieldCheck className="size-8 opacity-20" />
                      <p className="text-sm">
                        No incidents detected. System is healthy.
                      </p>
                      <p className="text-[10px] tracking-wider uppercase opacity-50">
                        All systems operational
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {isLoading && (
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-none" />
              ))}
            </div>
          )}

          <div ref={ref} className="flex h-10 items-center justify-center py-4">
            {isFetchingNextPage && (
              <Skeleton className="h-8 w-32 rounded-none" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogRow({ log }: { log: any }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { resolveLog, ignoreLog, deleteLog } = useLogActions();
  const isPending =
    resolveLog.isPending || ignoreLog.isPending || deleteLog.isPending;

  const handleAction = async (action: () => Promise<void>, msg: string) => {
    try {
      await action();
      toast.success(msg);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <TableRow className="border-muted-foreground/10 hover:bg-muted/30 group transition-colors">
        <TableCell>
          <LevelBadge level={log.level} />
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className="border-muted-foreground/10 rounded-none font-mono text-[10px] uppercase"
          >
            {log.source}
          </Badge>
        </TableCell>
        <TableCell className="max-w-[400px]">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{log.message}</span>
            <span className="text-muted-foreground truncate font-mono text-xs tracking-tighter">
              {log.pathname || "N/A"}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <StatusBadge status={log.status} />
        </TableCell>
        <TableCell className="text-muted-foreground text-right text-xs">
          {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="hover:border-muted-foreground/20 h-8 w-8 rounded-none border border-transparent p-0"
              >
                <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-muted-foreground/20 w-48 rounded-none"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-[10px] uppercase">
                  Operations
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="focus:bg-primary/10 flex cursor-pointer items-center gap-2"
                  onClick={() => setDetailsOpen(true)}
                >
                  <Eye size={14} /> View Payload
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-muted-foreground/10" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-500"
                  disabled={log.status === "resolved" || isPending}
                  onClick={() =>
                    handleAction(
                      () => resolveLog.mutateAsync(log.id),
                      "Log marked as resolved",
                    )
                  }
                >
                  <ShieldCheck size={14} /> Resolve
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 text-amber-500 focus:bg-amber-500/10 focus:text-amber-500"
                  disabled={log.status === "ignored" || isPending}
                  onClick={() =>
                    handleAction(
                      () => ignoreLog.mutateAsync(log.id),
                      "Log ignored",
                    )
                  }
                >
                  <Circle size={14} /> Ignore
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-muted-foreground/10" />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm("Permanently delete this log entry?")) {
                      handleAction(
                        () => deleteLog.mutateAsync(log.id),
                        "Log entry deleted",
                      );
                    }
                  }}
                >
                  <Trash size={14} /> Purge
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="border-muted-foreground/20 max-w-2xl overflow-hidden rounded-none bg-zinc-950 p-0 outline-none">
          <DialogHeader className="border-muted-foreground/10 bg-muted/20 border-b p-6">
            <DialogTitle className="text-primary flex items-center gap-2">
              <Bug size={20} /> Incident Details
            </DialogTitle>
          </DialogHeader>
          <div className="custom-scrollbar max-h-[70vh] space-y-4 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                  User Context
                </span>
                <div className="bg-muted/30 border-muted-foreground/10 rounded-none border p-2 font-mono text-sm">
                  {log.userEmail || "Anonymous Guest"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Pathname
                </span>
                <div className="bg-muted/30 border-muted-foreground/10 truncate rounded-none border p-2 font-mono text-sm">
                  {log.pathname || "/"}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                Message
              </span>
              <div className="border-primary bg-primary/5 rounded-none border-l-2 p-3 text-sm italic">
                "{log.message}"
              </div>
            </div>

            {log.stack && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                  Stack Trace
                </span>
                <pre className="border-muted-foreground/10 overflow-x-auto rounded-none border bg-zinc-900 p-4 font-mono text-[11px] text-zinc-400">
                  {log.stack}
                </pre>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                Metadata Context (JSON)
              </span>
              <pre className="border-muted-foreground/10 overflow-x-auto rounded-none border bg-zinc-900 p-4 font-mono text-[11px] text-emerald-500/80">
                {JSON.stringify(JSON.parse(log.context || "{}"), null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LevelBadge({ level }: { level: string }) {
  switch (level) {
    case "fatal":
      return (
        <Badge className="bg-destructive text-destructive-foreground animate-pulse rounded-none border-none">
          FATAL
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="rounded-none border-none">
          ERROR
        </Badge>
      );
    case "warn":
      return (
        <Badge className="rounded-none border-none bg-amber-500 text-white hover:bg-amber-600">
          WARN
        </Badge>
      );
    case "info":
      return (
        <Badge
          variant="secondary"
          className="rounded-none border-none bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
        >
          INFO
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="rounded-none">
          {level}
        </Badge>
      );
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "resolved":
      return (
        <Badge
          variant="outline"
          className="flex w-fit items-center gap-1 rounded-none border-emerald-500/20 bg-emerald-500/5 px-2 text-[10px] text-emerald-500 uppercase"
        >
          <CheckCircle size={10} /> Resolved
        </Badge>
      );
    case "ignored":
      return (
        <Badge
          variant="outline"
          className="border-muted-foreground/20 bg-muted/5 text-muted-foreground flex w-fit items-center gap-1 rounded-none px-2 text-[10px] uppercase"
        >
          <Circle size={10} /> Ignored
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="flex w-fit items-center gap-1 rounded-none border-amber-500/20 bg-amber-500/5 px-2 text-[10px] text-amber-500 uppercase"
        >
          <WarningCircle size={10} /> Open
        </Badge>
      );
  }
}
