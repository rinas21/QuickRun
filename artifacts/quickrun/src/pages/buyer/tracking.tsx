import { useParams, Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey, useGetDelivery, getGetDeliveryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Package, ArrowLeft, CheckCircle2, User, Phone, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function BuyerTracking() {
  const params = useParams();
  const orderId = Number(params.orderId);

  const { data: order, isLoading: isOrderLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId), refetchInterval: 5000 }
  });

  const deliveryId = order?.delivery?.id;

  const { data: delivery, isLoading: isDeliveryLoading } = useGetDelivery(deliveryId as number, {
    query: { enabled: !!deliveryId, queryKey: getGetDeliveryQueryKey(deliveryId as number), refetchInterval: 5000 }
  });

  if (isOrderLoading) {
    return <div className="p-8 text-center">Loading tracking info...</div>;
  }

  if (!order || !order.delivery) {
    return (
      <div className="p-8 text-center space-y-4">
        <p>Tracking not available yet.</p>
        <Button asChild><Link href={`/buyer/order/${orderId}`}>Back to Order</Link></Button>
      </div>
    );
  }

  const d = delivery || order.delivery;

  const steps = [
    { id: 'assigned', label: 'Driver Assigned', icon: User },
    { id: 'heading_to_seller', label: 'Heading to Seller', icon: Navigation },
    { id: 'picked_up', label: 'Picked Up', icon: Package },
    { id: 'heading_to_buyer', label: 'On the Way', icon: Navigation },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2 }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === d.status);
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/buyer/order/${orderId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Live Tracking</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Driver Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="font-bold text-lg">{d.driver.name}</p>
                <div className="flex items-center text-muted-foreground gap-2 mt-1">
                  <Phone className="h-4 w-4" /> {d.driver.phone || "No phone provided"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {steps.map((step, index) => {
                  const isCompleted = index <= activeIndex;
                  const isCurrent = index === activeIndex;
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.id} className={`flex items-start gap-4 ${isCompleted ? 'text-foreground' : 'text-muted-foreground opacity-50'}`}>
                      <div className={`mt-0.5 p-1 rounded-full ${isCurrent ? 'bg-primary text-primary-foreground animate-pulse' : isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <StepIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>{step.label}</p>
                        {isCurrent && <p className="text-xs text-muted-foreground mt-1">Current status</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full min-h-[400px] overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Map View (Simulation)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative bg-amber-50/50">
              {/* Fake Map Background */}
              <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'radial-gradient(circle at 50% 50%, #ccc 2px, transparent 2px)', 
                backgroundSize: '20px 20px' 
              }}></div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-sm p-6 bg-white/80 backdrop-blur rounded-xl shadow-lg border">
                  <Navigation className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-bold">Live Tracking Simulation</h3>
                  <p className="text-sm text-muted-foreground">
                    Driver Coordinates:<br/>
                    Lat: {d.driverLatitude?.toFixed(4) || "N/A"}<br/>
                    Lng: {d.driverLongitude?.toFixed(4) || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
