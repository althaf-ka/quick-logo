import { useState, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@quicklogo/ui/components/card";
import { Button } from "@quicklogo/ui/components/button";
import { Separator } from "@quicklogo/ui/components/separator";
import {
  LightningIcon,
  CheckIcon,
  StarIcon,
  ReceiptIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { toast } from "@quicklogo/ui/components/sonner";
import { PRICING_TIERS } from "@quicklogo/shared";
import {
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth, AUTH_KEYS } from "@/hooks/use-auth";
import { parseApiError } from "@/lib/api-error";
import { InView } from "react-intersection-observer";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, { classes: string; label: string }> = {
  completed: {
    classes: "bg-green-500/10 text-green-600",
    label: "Completed",
  },
  failed: {
    classes: "bg-red-500/10 text-red-600",
    label: "Failed",
  },
  cancelled: {
    classes: "bg-zinc-500/10 text-zinc-500",
    label: "Cancelled",
  },
  processing: {
    classes: "bg-blue-500/10 text-blue-600",
    label: "Processing",
  },
  pending: {
    classes: "bg-amber-500/10 text-amber-600",
    label: "Pending",
  },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}

export const Route = createFileRoute("/_authenticated/credits")({
  component: CreditsPage,
});

function CreditsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentCredits = user?.credits ?? 0;
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_cancelled") === "true") return false;
    const hasTxInUrl = params.has("transaction_id");
    const hasTxInStorage = !!sessionStorage.getItem("pending_transaction_id");
    return hasTxInUrl || hasTxInStorage;
  });
  const hasVerifiedRef = useRef(false);

  const verifyTransaction = useCallback(
    async (txId: string) => {
      try {
        const res = await api.payments.verify.$get({
          query: { transaction_id: txId },
        });
        if (!res.ok) return;
        const result = await res.json();

        if (result.status === "completed") {
          toast.success(
            `Payment successful! ${result.creditsAdded} credits added.`,
          );
          queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
        } else if (result.status === "failed") {
          toast.error("Payment failed. Please try again.");
        } else if (result.status === "cancelled") {
          toast.info("Payment was cancelled.");
        } else {
          toast.info(
            "Payment is still processing. Credits will be added shortly.",
          );
        }

        queryClient.invalidateQueries({ queryKey: ["transactions"] });
      } catch {
        // Webhook will handle reconciliation
      } finally {
        setIsVerifying(false);
      }
    },
    [queryClient],
  );

  if (!hasVerifiedRef.current) {
    hasVerifiedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const wasCancelled = params.get("payment_cancelled") === "true";
    const txIdFromUrl = params.get("transaction_id");

    if (wasCancelled) {
      window.history.replaceState({}, "", window.location.pathname);
      const cancelledTxId = sessionStorage.getItem("pending_transaction_id");
      sessionStorage.removeItem("pending_transaction_id");
      toast.info("Payment was cancelled.");

      if (cancelledTxId) {
        api.payments.cancel
          .$post({ json: { transaction_id: cancelledTxId } })
          .catch(() => {})
          .finally(() => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          });
      } else {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
      }
    } else if (txIdFromUrl) {
      window.history.replaceState({}, "", window.location.pathname);
      verifyTransaction(txIdFromUrl);
    } else {
      const pendingTxId = sessionStorage.getItem("pending_transaction_id");
      if (pendingTxId) {
        sessionStorage.removeItem("pending_transaction_id");
        verifyTransaction(pendingTxId);
      }
    }
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["transactions"],
      queryFn: async ({ pageParam }) => {
        const res = await api.payments.transactions.$get({
          query: { cursor: (pageParam as string) || undefined, limit: "10" },
        });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const createCheckoutMutation = useMutation({
    mutationFn: async (tierName: "Starter" | "Pro") => {
      const response = await api.payments.checkout.$post({
        json: {
          tierName,
          returnUrl: window.location.origin + window.location.pathname,
        },
      });

      if (!response.ok) {
        throw await parseApiError(response);
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.transactionId) {
        sessionStorage.setItem("pending_transaction_id", data.transactionId);
      }

      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initiate checkout");
      setLoadingTier(null);
    },
  });

  const handlePurchase = (tierName: string) => {
    setLoadingTier(tierName);
    createCheckoutMutation.mutate(tierName as "Starter" | "Pro");
  };

  const transactionsList = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl py-2">
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Billing & Credits
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your credit balance and view your transaction history.
        </p>
      </div>

      {isVerifying && (
        <Card className="border-blue-500/30 bg-blue-500/5 mb-8 shadow-none">
          <div className="flex items-center gap-3 p-4">
            <SpinnerGapIcon className="text-blue-500 size-5 animate-spin" />
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Verifying your payment status...
            </p>
          </div>
        </Card>
      )}

      <Card className="border-border/60 bg-muted/20 mb-8 shadow-none">
        <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <LightningIcon weight="fill" className="size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Available Balance
              </p>
              <div className="flex items-baseline gap-1">
                <h2 className="text-foreground text-3xl font-bold tracking-tight">
                  {currentCredits}
                </h2>
                <span className="text-muted-foreground text-sm font-semibold">
                  credits
                </span>
              </div>
            </div>
          </div>
          <div className="text-muted-foreground text-sm sm:text-right">
            Credits never expire. <br className="hidden sm:block" />
            Use them anytime to generate or edit logos.
          </div>
        </div>
      </Card>

      <Separator className="mb-8" />

      <div className="mb-12">
        <h2 className="text-foreground mb-4 text-lg font-semibold">
          Buy Credits
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={`hover:border-primary/30 relative flex flex-col shadow-sm transition-colors ${
                tier.popular
                  ? "border-primary/50 bg-primary/2"
                  : "border-border/60"
              }`}
            >
              <CardHeader className="pt-6 pb-4">
                <div className="mb-2 flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">
                    {tier.name}
                  </CardTitle>
                  {tier.popular && (
                    <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
                      <StarIcon weight="fill" className="size-3" />
                      Popular
                    </span>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {tier.description}
                </CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-foreground text-3xl font-bold tracking-tight">
                    {tier.price}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-6">
                <ul className="space-y-2.5">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckIcon
                        weight="bold"
                        className="text-primary mt-0.5 size-4 shrink-0"
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-0 pb-6">
                <Button
                  variant={tier.popular ? "default" : "outline"}
                  className="w-full font-semibold"
                  onClick={() => handlePurchase(tier.name)}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === tier.name ? (
                    <>
                      <SpinnerGapIcon className="mr-2 size-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Purchase ${tier.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <ReceiptIcon weight="bold" className="text-foreground size-5" />
          <h2 className="text-foreground text-lg font-semibold">
            Transaction History
          </h2>
        </div>
        <div className="border-border/60 bg-card border shadow-sm">
          <div className="border-border/60 bg-muted/30 text-muted-foreground grid grid-cols-4 gap-4 border-b px-4 py-3 text-xs font-semibold md:grid-cols-5">
            <div className="col-span-2">Description</div>
            <div className="hidden md:block">Date</div>
            <div className="text-right">Credits</div>
            <div className="text-right">Amount</div>
          </div>

          <div className="divide-border/60 divide-y">
            {transactionsList.length > 0 ? (
              <>
                {transactionsList.map((tx) => {
                  const style = getStatusStyle(tx.status);
                  return (
                    <div
                      key={tx.id}
                      className="grid grid-cols-4 items-center gap-4 px-4 py-3 text-sm md:grid-cols-5"
                    >
                      <div className="col-span-2">
                        <p className="text-foreground font-medium">
                          {tx.tierName} Package
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs md:hidden">
                          {format(new Date(tx.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-muted-foreground hidden md:block">
                        {format(new Date(tx.createdAt), "MMM d, yyyy")}
                      </div>
                      <div
                        className={`text-right font-medium ${
                          tx.status === "completed"
                            ? "text-green-600 dark:text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {tx.status === "completed"
                          ? `+${tx.creditsAdded}`
                          : "0"}
                      </div>
                      <div className="text-right">
                        <p className="text-foreground font-medium">
                          {tx.currency === "INR" ? "₹" : tx.currency}
                          {(tx.amount / 100).toFixed(2)}
                        </p>
                        <div className="mt-1 flex justify-end">
                          <span
                            className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${style.classes}`}
                          >
                            {style.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <InView
                  as="div"
                  onChange={(inView) => {
                    if (inView && hasNextPage && !isFetchingNextPage) {
                      fetchNextPage();
                    }
                  }}
                >
                  <div className="h-4 w-full" />
                </InView>
              </>
            ) : status === "pending" ? (
              <div className="flex items-center justify-center py-8">
                <SpinnerGapIcon className="text-muted-foreground size-6 animate-spin" />
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No previous transactions found.
              </div>
            )}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-6">
                <SpinnerGapIcon className="text-muted-foreground size-5 animate-spin" />
              </div>
            )}
          </div>
        </div>
        <div className="h-12" />
      </div>
    </div>
  );
}
