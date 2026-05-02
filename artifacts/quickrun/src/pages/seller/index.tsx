import { useState } from "react";
import { useListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ArrowRight, Store, CheckCircle, XCircle, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

function useMyOffers() {
  return useQuery({
    queryKey: ["my-offers"],
    queryFn: () => apiFetch("/api/offers/mine").then((r: any) => r.offers ?? []),
    refetchInterval: 15000,
  });
}

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState<"requests" | "my-offers">("requests");

  const { data: ordersData, isLoading: ordersLoading } = useListOrders({ status: "collecting_offers" }, {
    query: { refetchInterval: 10000, enabled: activeTab === "requests" }
  });

  const { data: myOffers = [], isLoading: offersLoading } = useMyOffers();

  const getOfferStatusBadge = (offer: any) => {
    if (offer.orderStatus === "delivered") {
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
    }
    if (offer.orderStatus === "cancelled") {
      return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
    if (offer.isSelected) {
      return <Badge className="bg-primary/10 text-primary border-primary/30"><CheckCircle className="h-3 w-3 mr-1" />Accepted by Buyer</Badge>;
    }
    if (offer.orderStatus === "collecting_offers") {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Awaiting decision</Badge>;
    }
    return <Badge variant="outline" className="capitalize">{offer.orderStatus?.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Portal</h1>
          <p className="text-muted-foreground">Respond to buyer requests and track your offers.</p>
        </div>
        {activeTab === "requests" && (
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            Listening for requests
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b pb-0">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
            ${activeTab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Incoming Requests
          {!!ordersData?.orders?.length && (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {ordersData.orders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("my-offers")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
            ${activeTab === "my-offers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          My Submitted Offers
          {(myOffers as any[]).length > 0 && (
            <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
              {(myOffers as any[]).length}
            </span>
          )}
        </button>
      </div>

      {/* Incoming Requests Tab */}
      {activeTab === "requests" && (
        ordersLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-32"></Card>)}
          </div>
        ) : !ordersData?.orders?.length ? (
          <Card className="border-dashed mt-4">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Store className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg">No active requests in your area right now.</p>
              <p className="text-sm">We'll alert you when someone needs something.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {ordersData.orders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-xl text-primary">{order.itemDescription}</h3>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">New Request</Badge>
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
        )
      )}

      {/* My Offers Tab */}
      {activeTab === "my-offers" && (
        offersLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-24"></Card>)}
          </div>
        ) : (myOffers as any[]).length === 0 ? (
          <Card className="border-dashed mt-4">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg">You haven't submitted any offers yet.</p>
              <p className="text-sm">Go to Incoming Requests to respond to buyers.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {(myOffers as any[]).map((offer: any) => (
              <Card key={offer.offerId} className={`transition-shadow hover:shadow-sm ${offer.isSelected ? "border-l-4 border-l-primary" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-base">{offer.itemDescription}</span>
                        {getOfferStatusBadge(offer)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {offer.deliveryAddress}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(offer.offerCreatedAt), { addSuffix: true })}
                        </span>
                      </div>

                      {offer.message && (
                        <p className="text-xs text-muted-foreground italic bg-muted/40 px-2 py-1 rounded">
                          "{offer.message}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col justify-center items-end gap-1">
                      <span className="text-lg font-bold text-primary">Rs. {offer.price?.toLocaleString()}</span>
                      {offer.estimatedMinutes && (
                        <span className="text-xs text-muted-foreground">{offer.estimatedMinutes} min est.</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
