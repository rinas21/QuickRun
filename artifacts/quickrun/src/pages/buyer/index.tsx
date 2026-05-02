import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateOrder, useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Package, MapPin, Clock, ArrowRight, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const createOrderSchema = z.object({
  itemDescription: z.string().min(3, "Please describe what you need"),
  deliveryAddress: z.string().min(5, "Please provide a delivery address"),
  notes: z.string().optional(),
});

export default function BuyerDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createOrderMutation = useCreateOrder();

  const { data: ordersData, isLoading } = useListOrders({ limit: 10 });

  // Read URL prefill params (from marketplace "Request Delivery" button)
  const searchParams = new URLSearchParams(window.location.search);
  const prefillItem = searchParams.get("item") ?? "";
  const prefillNotes = searchParams.get("notes") ?? "";
  const prefillAddress = searchParams.get("address") ?? "";

  const form = useForm<z.infer<typeof createOrderSchema>>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      itemDescription: prefillItem,
      deliveryAddress: prefillAddress,
      notes: prefillNotes,
    },
  });

  // Apply prefill values when URL params change
  useEffect(() => {
    if (prefillItem) form.setValue("itemDescription", prefillItem);
    if (prefillAddress) form.setValue("deliveryAddress", prefillAddress);
    if (prefillNotes) form.setValue("notes", prefillNotes);
  }, [prefillItem, prefillAddress, prefillNotes]);

  const onSubmit = (data: z.infer<typeof createOrderSchema>) => {
    createOrderMutation.mutate({
      data: {
        ...data,
        deliveryLatitude: 6.9271,
        deliveryLongitude: 79.8612,
      }
    }, {
      onSuccess: (order) => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        setLocation(`/buyer/order/${order.id}`);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":            return "bg-gray-100 text-gray-800";
      case "collecting_offers":  return "bg-blue-100 text-blue-800";
      case "offer_selected":     return "bg-yellow-100 text-yellow-800";
      case "driver_assigned":    return "bg-indigo-100 text-indigo-800";
      case "picked_up":          return "bg-orange-100 text-orange-800";
      case "delivered":          return "bg-green-100 text-green-800";
      case "cancelled":          return "bg-red-100 text-red-800";
      default:                   return "bg-gray-100 text-gray-800";
    }
  };

  const isTrackable = (status: string) =>
    ["driver_assigned", "picked_up"].includes(status);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card className={`shadow-md border-primary/20 bg-gradient-to-b from-white to-primary/5 ${prefillItem ? "ring-2 ring-primary/40" : ""}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-primary">
              <Package className="h-6 w-6" />
              {prefillItem ? "Complete Your Request" : "Need Something Fast?"}
            </CardTitle>
            <CardDescription>
              {prefillItem
                ? "We've pre-filled details from the marketplace."
                : "We'll broadcast your request to nearby sellers."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="itemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">What do you need?</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1TB SSD, Paracetamol, Half kilo of rice" className="text-lg py-6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Galle Road, Colombo 03" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any specific brands, urgency, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full text-lg py-6" disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? "Broadcasting..." : "Request Now"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Your Orders
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32"></CardContent>
              </Card>
            ))}
          </div>
        ) : !ordersData?.orders?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-20" />
              <p>You haven't made any requests yet.</p>
              <p className="text-sm">Create a new request to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {ordersData.orders.map((order) => {
              const isActive = ["pending", "collecting_offers", "offer_selected", "driver_assigned", "picked_up"].includes(order.status);
              const trackable = isTrackable(order.status);

              return (
                <Card key={order.id} className={`transition-all hover:shadow-md ${isActive ? "border-l-4 border-l-primary" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{order.itemDescription}</h3>
                          <Badge variant="outline" className={`capitalize ${getStatusColor(order.status)}`}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {order.deliveryAddress}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" /> {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                          </span>
                          {order.finalPrice && (
                            <span className="font-semibold text-primary">Rs. {order.finalPrice.toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <Button variant={isActive ? "default" : "outline"} asChild>
                          <Link href={trackable ? `/buyer/tracking/${order.id}` : `/buyer/order/${order.id}`}>
                            {trackable ? "Track Delivery" : "View Details"}
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
    </div>
  );
}
