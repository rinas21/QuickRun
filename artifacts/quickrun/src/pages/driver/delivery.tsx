import { useParams, Link } from "wouter";
import { useGetDelivery, getGetDeliveryQueryKey, useUpdateDeliveryStatus, useUpdateDriverLocation } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MapPin, Navigation, Package, ArrowLeft, Phone, User, Store, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export default function DriverDelivery() {
  const params = useParams();
  const deliveryId = Number(params.deliveryId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: d, isLoading } = useGetDelivery(deliveryId, {
    query: { enabled: !!deliveryId, queryKey: getGetDeliveryQueryKey(deliveryId), refetchInterval: 5000 }
  });

  const updateStatusMutation = useUpdateDeliveryStatus();
  const updateLocationMutation = useUpdateDriverLocation();

  // Simulate GPS location updates
  useEffect(() => {
    if (!d || d.status === 'delivered' || d.status === 'failed') return;

    const interval = setInterval(() => {
      // Small random changes to lat/lng
      const lat = (d.driverLatitude || 6.9271) + (Math.random() - 0.5) * 0.001;
      const lng = (d.driverLongitude || 79.8612) + (Math.random() - 0.5) * 0.001;
      
      updateLocationMutation.mutate({ data: { latitude: lat, longitude: lng } });
    }, 10000); // update every 10s

    return () => clearInterval(interval);
  }, [d?.status]);

  const handleStatusUpdate = (newStatus: any) => {
    updateStatusMutation.mutate({ deliveryId, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeliveryQueryKey(deliveryId) });
        toast({ title: `Status updated to ${newStatus.replace(/_/g, ' ')}` });
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading delivery...</div>;
  if (!d) return <div className="p-8 text-center">Delivery not found</div>;

  const isCompleted = d.status === 'delivered' || d.status === 'failed';

  const ActionButtons = () => {
    if (isCompleted) return <div className="w-full text-center text-primary font-bold text-lg"><CheckCircle2 className="inline mr-2"/> Job Completed</div>;

    switch (d.status) {
      case 'assigned':
        return <Button size="lg" className="w-full h-16 text-lg" onClick={() => handleStatusUpdate('heading_to_seller')}>Head to Seller</Button>;
      case 'heading_to_seller':
        return <Button size="lg" className="w-full h-16 text-lg" onClick={() => handleStatusUpdate('picked_up')}>Confirm Pickup</Button>;
      case 'picked_up':
        return <Button size="lg" className="w-full h-16 text-lg" onClick={() => handleStatusUpdate('heading_to_buyer')}>Head to Buyer</Button>;
      case 'heading_to_buyer':
        return <Button size="lg" className="w-full h-16 text-lg bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusUpdate('delivered')}>Complete Delivery</Button>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/driver"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Active Delivery</h1>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h2 className="text-sm font-bold tracking-wider text-primary uppercase mb-2">Item to Deliver</h2>
          <p className="text-2xl font-bold">{d.order?.itemDescription}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" /> 1. Pickup
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="font-bold text-lg">{d.offer?.seller?.name}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {d.offer?.seller?.phone || "No phone"}
            </div>
            <div className="bg-muted p-3 rounded text-sm font-medium">
              Pay Seller: Rs. {d.offer?.price}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> 2. Dropoff
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="font-bold text-lg">{d.order?.buyer?.name}</p>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5" /> 
              <span>{d.order?.deliveryAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {d.order?.buyer?.phone || "No phone"}
            </div>
            <div className="bg-primary/10 text-primary p-3 rounded text-sm font-bold border border-primary/20">
              Collect from Buyer: Rs. {d.offer?.price} + Fee
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button area at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t z-10">
        <div className="max-w-3xl mx-auto">
          <ActionButtons />
        </div>
      </div>
    </div>
  );
}
