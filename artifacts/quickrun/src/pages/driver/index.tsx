import { useState, useEffect } from "react";
import { useListDeliveries, getListDeliveriesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, ArrowRight, Store, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(user?.isOnline ?? false);
  const [isToggling, setIsToggling] = useState(false);

  const queryParams = {};
  const { data: deliveriesData, isLoading } = useListDeliveries(queryParams, {
    query: { refetchInterval: 10000, queryKey: getListDeliveriesQueryKey(queryParams) }
  });

  // Sync with user state from token
  useEffect(() => {
    if (user?.isOnline !== undefined) {
      setIsOnline(user.isOnline);
    }
  }, [user?.isOnline]);

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsToggling(true);
    try {
      await apiFetch("/api/auth/online", {
        method: "PUT",
        body: JSON.stringify({ isOnline: newStatus }),
      });
      setIsOnline(newStatus);
      toast({
        title: newStatus ? "You're now online" : "You've gone offline",
        description: newStatus ? "You'll receive delivery jobs." : "No new jobs will be assigned.",
      });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setIsToggling(false);
    }
  };

  const activeDeliveries = deliveriesData?.filter(
    (d: any) => d.status !== "delivered" && d.status !== "failed"
  ) ?? [];
  const completedDeliveries = deliveriesData?.filter(
    (d: any) => d.status === "delivered" || d.status === "failed"
  ) ?? [];

  const DeliveryCard = ({ delivery }: { delivery: any }) => {
    const isCompleted = delivery.status === "delivered" || delivery.status === "failed";
    const sellerName = delivery.offer?.seller?.name ?? delivery.offer?.seller?.phone ?? "Seller";
    const buyerAddress = delivery.order?.deliveryAddress ?? "Delivery address";
    const itemName = delivery.order?.itemDescription ?? "Item";

    return (
      <Card key={delivery.id} className={`${isCompleted ? "opacity-60" : "border-l-4 border-l-primary shadow-md"}`}>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row justify-between gap-5">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <Badge variant={isCompleted ? "outline" : "default"} className="capitalize">
                  {delivery.status.replace(/_/g, " ")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(delivery.createdAt), { addSuffix: true })}
                </span>
              </div>

              <p className="font-semibold text-base text-foreground">{itemName}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1 bg-muted/30 p-3 rounded-md">
                  <span className="text-muted-foreground flex items-center gap-1 font-semibold uppercase text-xs tracking-wider">
                    <Store className="h-3 w-3" /> Pickup From
                  </span>
                  <span className="block font-medium text-foreground">{sellerName}</span>
                  {delivery.offer?.price && (
                    <span className="text-xs text-primary font-medium">Rs. {delivery.offer.price.toLocaleString()}</span>
                  )}
                </div>
                <div className="space-y-1 bg-muted/30 p-3 rounded-md">
                  <span className="text-muted-foreground flex items-center gap-1 font-semibold uppercase text-xs tracking-wider">
                    <MapPin className="h-3 w-3" /> Deliver To
                  </span>
                  <span className="block font-medium text-foreground">{buyerAddress}</span>
                  {delivery.order?.buyer?.name && (
                    <span className="text-xs text-muted-foreground">{delivery.order.buyer.name}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center md:border-l md:pl-5">
              <Button
                size="lg"
                variant={isCompleted ? "outline" : "default"}
                className="w-full md:w-auto shadow-sm"
                asChild
              >
                <Link href={`/driver/delivery/${delivery.id}`}>
                  {isCompleted ? "View Details" : "Start Job"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header with online toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Jobs</h1>
          <p className="text-muted-foreground">Your assigned deliveries — {activeDeliveries.length} active.</p>
        </div>

        <button
          onClick={handleToggleOnline}
          disabled={isToggling}
          className={`flex items-center gap-3 px-5 py-3 rounded-full border-2 font-semibold text-sm transition-all shadow-sm
            ${isOnline
              ? "bg-green-50 border-green-400 text-green-700 hover:bg-green-100"
              : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
            } ${isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className="relative flex h-3 w-3">
            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? "bg-green-500" : "bg-gray-400"}`}></span>
          </span>
          {isOnline ? (
            <><Wifi className="h-4 w-4" /> Online</>
          ) : (
            <><WifiOff className="h-4 w-4" /> Offline</>
          )}
        </button>
      </div>

      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex items-center gap-3">
          <WifiOff className="h-5 w-5 shrink-0 text-yellow-500" />
          <span>You're offline. Go online to receive delivery assignments.</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <Card key={i} className="animate-pulse h-36"></Card>)}
        </div>
      ) : activeDeliveries.length === 0 && completedDeliveries.length === 0 ? (
        <Card className="border-dashed mt-8">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No deliveries assigned yet.</p>
            <p className="text-sm">Stay online to receive new jobs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-primary">Active Jobs</h2>
              <div className="grid gap-4">
                {activeDeliveries.map((d: any) => <DeliveryCard key={d.id} delivery={d} />)}
              </div>
            </div>
          )}

          {completedDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Completed</h2>
              <div className="grid gap-4">
                {completedDeliveries.map((d: any) => <DeliveryCard key={d.id} delivery={d} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
