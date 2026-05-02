import { useParams, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey, useGetDelivery, getGetDeliveryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Package, ArrowLeft, CheckCircle2, User, Phone, Clock } from "lucide-react";
import { MapView } from "@/components/map-view";

// Steps match actual delivery status flow in the Go backend
const STATUS_STEPS = [
  { id: "heading_to_seller", label: "Driver Heading to Seller", icon: Navigation },
  { id: "picking_up",        label: "At Seller — Picking Up",  icon: Package },
  { id: "heading_to_buyer",  label: "On the Way to You",       icon: Navigation },
  { id: "delivered",         label: "Delivered!",              icon: CheckCircle2 },
];

export default function BuyerTracking() {
  const params = useParams();
  const orderId = Number(params.orderId);

  const { data: order, isLoading: orderLoading } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId,
      queryKey: getGetOrderQueryKey(orderId),
      refetchInterval: 6000,
    },
  });

  const rawOrder = order as any;
  const deliveryId = rawOrder?.delivery?.id;

  const { data: delivery } = useGetDelivery(deliveryId as number, {
    query: {
      enabled: !!deliveryId,
      queryKey: getGetDeliveryQueryKey(deliveryId as number),
      refetchInterval: 6000,
    },
  });

  // Use enriched delivery from GET /deliveries/:id, fall back to embedded ref
  const d = (delivery ?? rawOrder?.delivery) as any;

  if (orderLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading tracking info…</div>;
  }

  if (!rawOrder || !rawOrder.delivery) {
    return (
      <div className="p-8 text-center space-y-4">
        <Navigation className="h-12 w-12 text-muted-foreground/40 mx-auto" />
        <p className="font-semibold">Tracking not available yet.</p>
        <p className="text-sm text-muted-foreground">Once a driver is assigned your delivery will appear here.</p>
        <Button asChild><Link href={`/buyer/order/${orderId}`}>Back to Order</Link></Button>
      </div>
    );
  }

  const activeIndex = STATUS_STEPS.findIndex((s) => s.id === d?.status);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;
  const isDelivered = d?.status === "delivered";

  const mapMarkers: Array<{ lat: number; lng: number; label: string; color: "orange" | "blue" | "green" | "red"; pulse?: boolean }> = [];
  if (d?.driverLatitude && d?.driverLongitude) {
    mapMarkers.push({
      lat: d.driverLatitude,
      lng: d.driverLongitude,
      label: `Driver: ${d?.driver?.name ?? "Your Driver"}`,
      color: "orange",
      pulse: !isDelivered,
    });
  }
  if (rawOrder.deliveryLatitude && rawOrder.deliveryLongitude) {
    mapMarkers.push({
      lat: rawOrder.deliveryLatitude,
      lng: rawOrder.deliveryLongitude,
      label: "Delivery Location",
      color: "blue",
    });
  }
  if (mapMarkers.length === 0) {
    mapMarkers.push({ lat: 6.9271, lng: 79.8612, label: "Colombo", color: "blue" });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/buyer/order/${orderId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Live Tracking</h1>
        {isDelivered && (
          <span className="ml-auto bg-green-100 text-green-700 font-medium px-3 py-1 rounded-full text-sm flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Delivered
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="md:col-span-1 space-y-4">
          {d?.driver && (
            <Card>
              <CardHeader className="bg-primary/5 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Driver Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <p className="font-bold text-lg">{d.driver.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {d.driver.phone || "No phone"}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex && !isDelivered;
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 ${isCompleted ? "text-foreground" : "text-muted-foreground opacity-40"}`}
                    >
                      <div className={`p-1.5 rounded-full shrink-0 transition-all
                        ${isCurrent ? "bg-primary text-primary-foreground animate-pulse" :
                          isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <StepIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className={`text-sm font-medium ${isCurrent ? "text-primary" : ""}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{rawOrder.deliveryAddress}</span>
              </div>
              {d?.offer?.price && (
                <p className="text-xs font-medium text-primary">Order total: Rs. {d.offer.price.toLocaleString()}</p>
              )}
              {d?.driverLatitude && (
                <p className="text-xs text-muted-foreground">
                  Driver at {d.driverLatitude.toFixed(4)}, {d.driverLongitude?.toFixed(4)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="md:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/40 border-b py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Live Map
                {!isDelivered && d?.driverLatitude && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 font-normal">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MapView
                markers={mapMarkers}
                zoom={14}
                className="rounded-none border-0"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
