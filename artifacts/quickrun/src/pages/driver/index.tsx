import { useListDeliveries } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, ArrowRight, Store } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DriverDashboard() {
  const { data: deliveriesData, isLoading } = useListDeliveries({ limit: 20 }, {
    query: { refetchInterval: 10000 }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Delivery Jobs</h1>
        <p className="text-muted-foreground">Manage your assigned deliveries here.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <Card key={i} className="animate-pulse h-32"></Card>)}
        </div>
      ) : !deliveriesData?.deliveries?.length ? (
        <Card className="border-dashed mt-8">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No active deliveries assigned to you right now.</p>
            <p className="text-sm">Stay online to receive new jobs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 mt-4">
          {deliveriesData.deliveries.map(delivery => {
            const isCompleted = delivery.status === 'delivered' || delivery.status === 'failed';
            return (
              <Card key={delivery.id} className={`${isCompleted ? 'opacity-60' : 'border-l-4 border-l-primary'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={isCompleted ? "outline" : "default"} className="capitalize">
                          {delivery.status.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(delivery.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1 bg-muted/30 p-3 rounded">
                          <span className="text-muted-foreground flex items-center gap-1 font-semibold uppercase text-xs tracking-wider">
                            <Store className="h-3 w-3" /> Pickup From
                          </span>
                          <span className="block font-medium">{delivery.offer?.seller?.name || "Seller"}</span>
                        </div>
                        <div className="space-y-1 bg-muted/30 p-3 rounded">
                          <span className="text-muted-foreground flex items-center gap-1 font-semibold uppercase text-xs tracking-wider">
                            <MapPin className="h-3 w-3" /> Deliver To
                          </span>
                          <span className="block font-medium">{delivery.order?.deliveryAddress || "Buyer Address"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center md:border-l md:pl-6">
                      <Button size="lg" variant={isCompleted ? "outline" : "default"} className="w-full md:w-auto shadow-sm" asChild>
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
          })}
        </div>
      )}
    </div>
  );
}
