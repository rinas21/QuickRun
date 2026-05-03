import { useParams, Link } from "wouter";
import { 
  useGetOrder, 
  getGetOrderQueryKey, 
  useCancelOrder, 
  useSelectOffer, 
  useListOffers,
  getListOffersQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ArrowLeft, Store, Tag, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function BuyerOrderDetail() {
  const params = useParams();
  const orderId = Number(params.orderId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: order, isLoading: isOrderLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) }
  });

  const { data: offers = [], isLoading: isOffersLoading } = useListOffers(orderId, {
    query: { 
      enabled: !!orderId && order?.status === 'collecting_offers', 
      queryKey: getListOffersQueryKey(orderId),
      // @ts-ignore - refetchInterval type mismatch in v5 orval output
      refetchInterval: order?.status === 'collecting_offers' ? 5000 : false
    }
  });

  const cancelOrderMutation = useCancelOrder();
  const selectOfferMutation = useSelectOffer();

  if (isOrderLoading) {
    return <div className="p-8 text-center">Loading order details...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500">Order not found</div>;
  }

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this request?")) {
      cancelOrderMutation.mutate({ orderId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
          toast({ title: "Order cancelled" });
        }
      });
    }
  };

  const handleSelectOffer = (offerId: number) => {
    selectOfferMutation.mutate({ offerId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        queryClient.invalidateQueries({ queryKey: getListOffersQueryKey(orderId) });
        toast({ title: "Offer selected!", description: "Waiting for driver assignment." });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/buyer"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Request Details</h1>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20 capitalize">
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{order.itemDescription}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {order.deliveryAddress}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.notes && (
            <div className="bg-muted p-4 rounded-md text-sm">
              <strong>Notes:</strong> {order.notes}
            </div>
          )}
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" /> Requested {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
          </div>
        </CardContent>
        {order.status === 'pending' || order.status === 'collecting_offers' ? (
          <CardFooter>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelOrderMutation.isPending}>
              Cancel Request
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      {order.status === 'collecting_offers' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Incoming Offers
          </h2>
          <p className="text-sm text-muted-foreground">Nearby sellers are reviewing your request...</p>
          
          {isOffersLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-md"></div>)}
            </div>
          ) : offers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Store className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>Waiting for sellers to respond...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {offers.map(offer => (
                <Card key={offer.id} className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{offer.seller.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 font-bold text-lg text-primary">
                            <Tag className="h-4 w-4" /> Rs. {offer.price}
                          </span>
                          {offer.estimatedMinutes && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" /> ~{offer.estimatedMinutes} mins
                            </span>
                          )}
                        </div>
                        {offer.message && (
                          <p className="text-sm bg-muted/50 p-2 rounded italic">"{offer.message}"</p>
                        )}
                      </div>
                      <Button 
                        size="lg" 
                        onClick={() => handleSelectOffer(offer.id)}
                        disabled={selectOfferMutation.isPending}
                        className="w-full md:w-auto"
                      >
                        Accept Offer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {(order.status === 'offer_selected' || order.status === 'driver_assigned' || order.status === 'picked_up' || order.status === 'delivered') && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-xl font-bold">Offer Accepted!</h3>
            <p className="text-muted-foreground">
              {order.status === 'offer_selected' ? "Waiting for a driver to accept the job..." : "A driver is handling your delivery."}
            </p>
            {['driver_assigned', 'picked_up', 'delivered'].includes(order.status) && (
              <Button asChild size="lg" className="mt-4">
                <Link href={`/buyer/tracking/${order.id}`}>Track Delivery</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {order.status === 'cancelled' && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-6 text-center text-destructive">
            <XCircle className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-xl font-bold">Order Cancelled</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
