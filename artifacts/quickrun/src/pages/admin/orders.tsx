import { useState } from "react";
import { useListOrders, useCancelOrder, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { XCircle, Eye, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Collecting Offers", value: "collecting_offers" },
  { label: "Driver Assigned", value: "driver_assigned" },
  { label: "Picked Up", value: "picked_up" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_COLOR: Record<string, string> = {
  pending:           "bg-gray-100 text-gray-700",
  collecting_offers: "bg-blue-100 text-blue-700",
  offer_selected:    "bg-yellow-100 text-yellow-700",
  driver_assigned:   "bg-indigo-100 text-indigo-700",
  picked_up:         "bg-orange-100 text-orange-700",
  delivered:         "bg-green-100 text-green-700",
  cancelled:         "bg-red-100 text-red-700",
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useListOrders(
    { limit: 100, ...(statusFilter ? { status: statusFilter as any } : {}) },
    { query: { refetchInterval: 15000 } }
  );

  const cancelMutation = useCancelOrder();

  const handleCancel = (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Cancel order #${orderId}?`)) return;
    cancelMutation.mutate({ orderId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: `Order #${orderId} cancelled` });
      },
      onError: () => toast({ title: "Failed to cancel order", variant: "destructive" }),
    });
  };

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Orders</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} total orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
              ${statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No orders found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Address</TableHead>
                  <TableHead className="hidden sm:table-cell">Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const canCancel = ["pending", "collecting_offers"].includes(order.status);
                  return (
                    <TableRow key={order.id} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">#{order.id}</TableCell>
                      <TableCell>
                        <span className="font-medium line-clamp-1">{order.itemDescription}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize text-xs ${STATUS_COLOR[order.status] ?? ""}`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[180px]">
                        <span className="block truncate">{order.deliveryAddress}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm font-medium">
                        {order.finalPrice ? `Rs. ${order.finalPrice.toLocaleString()}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {format(new Date(order.createdAt), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link href={`/buyer/order/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleCancel(order.id, e)}
                              disabled={cancelMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
