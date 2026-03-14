import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteAdminTransactions } from "@/hooks/use-admin";
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
import { format } from "date-fns";
import {
  CreditCard,
  Receipt,
  WarningCircle,
  CheckCircle,
  Clock,
} from "@phosphor-icons/react";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteAdminTransactions();

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allTransactions =
    data?.pages.flatMap((page) => page?.items ?? []) ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="bg-gradient-to-r from-emerald-500 to-emerald-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Revenue & Payments
          </h2>
          <p className="text-muted-foreground">
            Monitor transaction flow and platform revenue.
          </p>
        </div>
        <div className="rounded-none border border-emerald-500/20 bg-emerald-500/10 p-3">
          <CreditCard className="size-6 text-emerald-500" />
        </div>
      </div>

      <Card className="border-muted-foreground/10 bg-muted/5 overflow-hidden rounded-none shadow-xl backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-muted-foreground/10 border-b py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Receipt className="size-5 text-emerald-500" />
            Transaction Ledger
            <Badge variant="secondary" className="ml-2 rounded-none font-mono">
              {data?.pages[0]?.metadata?.total ?? 0} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-muted-foreground/10 hover:bg-transparent">
                <TableHead className="w-[200px]">Transaction ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Settlement Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTransactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  className="border-muted-foreground/10 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="text-muted-foreground font-mono text-[10px] tracking-tighter uppercase">
                    {tx.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {tx.userEmail || "Anonymous"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-emerald-500">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: tx.currency,
                      }).format(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-sm">
                    {format(new Date(tx.createdAt), "MMM d, h:mm a")}
                  </TableCell>
                </TableRow>
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
            <div className="text-destructive p-12 text-center">
              Failed to load transaction data.
            </div>
          )}

          {/* Infinite Scroll Trigger */}
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="outline"
          className="flex w-fit items-center gap-1 rounded-none border-emerald-500/20 bg-emerald-500/5 px-2 text-emerald-500"
        >
          <CheckCircle size={12} /> Success
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className="flex w-fit items-center gap-1 rounded-none border-amber-500/20 bg-amber-500/5 px-2 text-amber-500"
        >
          <Clock size={12} /> Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className="text-destructive border-destructive/20 bg-destructive/5 flex w-fit items-center gap-1 rounded-none px-2"
        >
          <WarningCircle size={12} /> Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="rounded-none">
          {status}
        </Badge>
      );
  }
}
