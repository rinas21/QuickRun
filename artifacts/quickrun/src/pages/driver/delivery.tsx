import { useParams, Link } from "wouter";
import { useGetDelivery, getGetDeliveryQueryKey, useUpdateDeliveryStatus, useUpdateDriverLocation } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Package, ArrowLeft, Phone, User, Store, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { MapView } from "@/components/map-view";

export default function DriverDelivery() {
  const params = useParams();
  const deliveryId = Number(params.deliveryId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const posRef = useRef<{ lat: number; lng: number } | null>(null);

  const { data: rawDelivery, isLoading } = useGetDelivery(deliveryId, {
    query: { enabled: !!deliveryId, queryKey: getGetDeliveryQueryKey(deliveryId), refetchInterval: 5000 },
  });
  const d = rawDelivery as any;

  const updateStatusMutation = useUpdateDeliveryStatus();
  const updateLocationMutation = useUpdateDriverLocation();

  // Simulate GPS — small random drift from current stored position
  useEffect(() => {
    if (!d || d.status === "delivered" || d.status === "failed") return;
    const interval = setInterval(() => {
      const baseLat = posRef.current?.lat ?? d.driverLatitude ?? 6.9271;
      const baseLng = posRef.current?.lng ?? d.driverLongitude ?? 79.8612;
      const lat = baseLat + (Math.random() - 0.5) * 0.001;
      const lng = baseLng + (Math.random() - 0.5) * 0.001;
      posRef.current = { lat, lng };
      updateLocationMutation.mutate(
        { deliveryId, data: { latitude: lat, longitude: lng } },
        { onSuccess: () => qc.invalidateQueries({ queryKey: getGetDeliveryQueryKey(deliveryId) }) }
      );
    }, 12000);
    return () => clearInterval(interval);
  }, [d?.status]);

  const handleStatusUpdate = (newStatus: string) => {
    updateStatusMutation.mutate(
      { deliveryId, data: { status: newStatus } as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetDeliveryQueryKey(deliveryId) });
          toast({ title: `Status: ${newStatus.replace(/_/g, " ")}` });
        },
      }
    );
  };

  const mapMarkers = useMemo(() => {
    if (!d) return [];
    const markers = [];
    if (d.driverLatitude && d.driverLongitude) {
      markers.push({ lat: d.driverLatitude, lng: d.driverLongitude, label: "You", color: "orange" as const, pulse: true });
    }
    if (d.order?.deliveryLatitude && d.order?.deliveryLongitude) {
      markers.push({ lat: d.order.deliveryLatitude, lng: d.order.deliveryLongitude, label: `Drop-off: ${d.order?.buyer?.name}`, color: "blue" as const });
    }
    if (markers.length === 0) {
      markers.push({ lat: 6.9271, lng: 79.8612, label: "Colombo", color: "blue" as const });
    }
    return markers;
  }, [d?.driverLatitude, d?.driverLongitude]);

  if (isLoading) return <div className="p-8 text-center">Loading delivery…</div>;
  if (!d) return <div className="p-8 text-center">Delivery not found</div>;

  const isCompleted = d.status === "delivered" || d.status === "failed";

  const ActionButton = () => {
    if (isCompleted) return (
      <div className="w-full text-center text-green-600 font-bold text-lg flex items-center justify-center gap-2">
        <CheckCircle2 className="h-6 w-6" /> Job Completed!
      </div>
    );
    switch (d.status) {
      case "heading_to_seller": return <Button size="lg" className="w-full h-14 text-base" onClick={() => handleStatusUpdate("picking_up")}>Arrived at Seller — Confirm Pickup</Button>;
      case "picking_up": return <Button size="lg" className="w-full h-14 text-base" onClick={() => handleStatusUpdate("heading_to_buyer")}>Heading to Buyer</Button>;
      case "heading_to_buyer": return <Button size="lg" className="w-full h-14 text-base bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate("delivered")}>Complete Delivery ✓</Button>;
      default: return <Button size="lg" className="w-full h-14 text-base" onClick={() => handleStatusUpdate("heading_to_seller")}>Start — Head to Seller</Button>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-28">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/driver"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Active Delivery</h1>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <p className="text-xs font-bold tracking-wider text-primary uppercase mb-1">Item to Deliver</p>
          <p className="text-xl font-bold">{d.order?.itemDescription ?? "—"}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" /> 1. Pickup from Seller
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <p className="font-bold">{d.offer?.seller?.name ?? "—"}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {d.offer?.seller?.phone ?? "No phone"}
            </div>
            <div className="bg-muted p-2.5 rounded text-sm font-semibold">
              Pay Seller: Rs. {d.offer?.price?.toLocaleString() ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> 2. Drop-off to Buyer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <p className="font-bold">{d.order?.buyer?.name ?? "—"}</p>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5" />
              <span>{d.order?.deliveryAddress ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {d.order?.buyer?.phone ?? "No phone"}
            </div>
            <div className="bg-primary/10 text-primary p-2.5 rounded text-sm font-semibold border border-primary/20">
              Collect: Rs. {d.offer?.price?.toLocaleString() ?? "—"} + Delivery Fee
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Map */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" /> Your Location
            {d.driverLatitude && (
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {d.driverLatitude.toFixed(4)}, {d.driverLongitude.toFixed(4)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MapView markers={mapMarkers} zoom={14} className="rounded-none border-0" />
        </CardContent>
      </Card>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-10">
        <div className="max-w-3xl mx-auto">
          <ActionButton />
        </div>
      </div>
    </div>
  );
}
