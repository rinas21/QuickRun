import { useParams, Link, useLocation } from "wouter";
import { useGetOrder, getGetOrderQueryKey, useCreateOffer } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const offerSchema = z.object({
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  estimatedMinutes: z.coerce.number().min(1, "Must be at least 1 minute"),
  message: z.string().optional()
});

export default function SellerRespond() {
  const params = useParams();
  const orderId = Number(params.orderId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) }
  });

  const createOfferMutation = useCreateOffer();

  const form = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
    defaultValues: { price: 0, estimatedMinutes: 30, message: "I have this in stock and can pack it immediately." }
  });

  const onSubmit = (data: z.infer<typeof offerSchema>) => {
    createOfferMutation.mutate({
      orderId,
      data: {
        price: data.price,
        available: true,
        estimatedMinutes: data.estimatedMinutes,
        message: data.message
      }
    }, {
      onSuccess: () => {
        toast({ title: "Offer submitted successfully!" });
        setLocation("/seller");
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/seller"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Submit Offer</h1>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="space-y-2">
            <h3 className="text-sm text-primary font-bold tracking-wider uppercase">Buyer Needs</h3>
            <p className="text-xl font-bold">{order.itemDescription}</p>
            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <MapPin className="h-4 w-4" /> {order.deliveryAddress}
            </div>
            {order.notes && (
              <p className="text-sm italic mt-2">"{order.notes}"</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Offer</CardTitle>
          <CardDescription>Set a competitive price to win this order.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Price (Rs.)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1500" {...field} className="text-lg font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prep Time (Minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message to Buyer (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="E.g. Exact brand available, packed and ready." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={createOfferMutation.isPending}>
                {createOfferMutation.isPending ? "Submitting..." : "Submit Offer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
