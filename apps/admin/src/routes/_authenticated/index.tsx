import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@quicklogo/ui/components/card";
import {
  Users,
  FolderSimple,
  CreditCard,
  ChartLineUp,
} from "@phosphor-icons/react";

import { useAdminDashboard } from "@/hooks/use-admin";
import { Skeleton } from "@quicklogo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@quicklogo/ui/components/table";
import { Badge } from "@quicklogo/ui/components/badge";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, isError } = useAdminDashboard();

  const stats = [
    {
      title: "Total Users",
      value: data?.metrics.totalUsers ?? 0,
      icon: Users,
      description: "Registered users",
      trend: null,
    },
    {
      title: "Total Revenue",
      value: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(data?.metrics.totalRevenue ?? 0),
      icon: CreditCard,
      description: "Total gross revenue",
      trend: data?.metrics.revenueGrowth
        ? {
            value: `${data.metrics.revenueGrowth.toFixed(1)}%`,
            label: "vs last month",
            isPositive: data.metrics.revenueGrowth > 0,
          }
        : null,
    },
    {
      title: "Total Projects",
      value: data?.metrics.totalTransactions ?? 0, // Using transactions as a proxy or just showing transactions
      icon: FolderSimple,
      description: "Successful projects",
    },
    {
      title: "Images Generated",
      value: data?.metrics.totalImages ?? 0,
      icon: ChartLineUp,
      description: "High-quality logos",
    },
  ];

  if (isError) {
    return (
      <div className="text-destructive flex h-[400px] items-center justify-center rounded-lg border border-dashed">
        Failed to load dashboard metrics. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard Overview
        </h2>
        <p className="text-muted-foreground text-lg">
          Platform performance and recent activity at a glance.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="bg-muted h-4 w-24 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="bg-muted mb-2 h-8 w-16 rounded" />
                  <div className="bg-muted h-3 w-32 rounded" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card
                key={stat.title}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                    {stat.title}
                  </CardTitle>
                  <div className="bg-primary/10 rounded-full p-2">
                    <stat.icon
                      className="text-primary size-5"
                      weight="duotone"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="mt-1 flex items-center space-x-2">
                    <p className="text-muted-foreground text-xs">
                      {stat.description}
                    </p>
                    {stat.trend && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          stat.trend.isPositive
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {stat.trend.isPositive ? "+" : ""}
                        {stat.trend.value}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Users</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Last 5 registrations
                </p>
              </div>
              <Users
                className="text-muted-foreground size-6"
                weight="duotone"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentUsers && data.recentUsers.length > 0 ? (
                    data.recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-muted-foreground py-8 text-center"
                      >
                        No recent users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Latest Transactions</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Most recent payments
                </p>
              </div>
              <CreditCard
                className="text-muted-foreground size-6"
                weight="duotone"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentTransactions &&
                  data.recentTransactions.length > 0 ? (
                    data.recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: tx.currency,
                          }).format(tx.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tx.status === "completed"
                                ? "default"
                                : tx.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm">
                          {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-muted-foreground py-8 text-center"
                      >
                        No recent transactions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
