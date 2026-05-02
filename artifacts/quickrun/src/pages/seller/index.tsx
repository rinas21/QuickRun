import { useListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ArrowRight, Store } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SellerDashboard() {
  // Sellers see pending orders that need offers
  const { data: ordersData, isLoading } = useListOrders({ status: "collecting_offers" }, {
    query: { refetchInterval: 10000 }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incoming Requests</h1>
          <p className="text-muted-foreground">Buyers nearby need these items right now.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          Listening for requests
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-32"></Card>)}
        </div>
      ) : !ordersData?.orders?.length ? (
        <Card className="border-dashed mt-8">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
            <Store className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No active requests in your area right now.</p>
            <p className="text-sm">We'll alert you when someone needs something.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 mt-8">
          {ordersData.orders.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-xl text-primary">{order.itemDescription}</h3>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        New Request
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {order.deliveryAddress}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Requested {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {order.notes && (
                      <p className="text-sm bg-muted/50 p-2 rounded text-foreground">
                        <span className="font-medium mr-1">Notes:</span> {order.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center md:border-l md:pl-6">
                    <Button size="lg" className="w-full md:w-auto shadow-sm" asChild>
                      <Link href={`/seller/respond/${order.id}`}>
                        Make an Offer
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
