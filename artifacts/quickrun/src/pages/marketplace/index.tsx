import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingBag, Phone, Package, Tag, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["all", "electronics", "grocery", "pharmacy", "stationery", "general"];

interface InventoryItem {
  id: number;
  sellerId: number;
  sellerName: string;
  sellerPhone: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  isAvailable: boolean;
  imageUrl?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  electronics: "💻",
  grocery: "🛒",
  pharmacy: "💊",
  stationery: "📝",
  general: "📦",
  all: "🏪",
};

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", category, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      const res = await apiFetch<{ items: InventoryItem[]; total: number }>(
        `/api/inventory?${params.toString()}`
      );
      return res;
    },
    staleTime: 30000,
  });

  const handleRequestItem = (item: InventoryItem) => {
    if (!user) {
      toast({ title: "Please login as a buyer to order", variant: "destructive" });
      setLocation("/login");
      return;
    }
    if (user?.role !== "buyer") {
      toast({ title: "Only buyers can place orders", variant: "destructive" });
      return;
    }
    // Pre-fill the buyer dashboard form with item details
    const notes = `From ${item.sellerName} · Rs. ${item.price.toLocaleString()} per ${item.unit}`;
    setLocation(`/buyer?item=${encodeURIComponent(item.name)}&notes=${encodeURIComponent(notes)}`);
  };

  const items = data?.items ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-primary" />
          Marketplace
        </h1>
        <p className="text-muted-foreground">Browse available inventory from local sellers in Colombo &amp; Negombo</p>
      </div>

      {/* Search + Category Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "default" : "outline"}
              onClick={() => setCategory(cat)}
              className="capitalize gap-1"
            >
              <span>{CATEGORY_ICONS[cat]}</span> {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Package className="h-4 w-4" />
        {isLoading ? "Loading..." : `${items.length} product${items.length !== 1 ? "s" : ""} available`}
        {search && <Badge variant="secondary">Searching: "{search}"</Badge>}
        {category !== "all" && <Badge variant="secondary" className="capitalize">{category}</Badge>}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <p className="text-xl font-semibold">No products found</p>
          <p className="text-muted-foreground">Try a different category or search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow border-border/60">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-base leading-tight">{item.name}</h3>
                    <Badge variant="outline" className="capitalize mt-1 text-xs">
                      {CATEGORY_ICONS[item.category] || "📦"} {item.category}
                    </Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-primary">Rs. {item.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">per {item.unit}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-3 flex-1 space-y-2">
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">In stock:</span>
                  <span className="font-medium">{item.quantity} {item.unit}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{item.sellerName}</span>
                  <span>· {item.sellerPhone}</span>
                </div>
              </CardContent>

              <CardFooter className="px-5 pb-5 pt-0">
                <Button
                  className="w-full gap-2"
                  onClick={() => handleRequestItem(item)}
                  disabled={user?.role !== "buyer"}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {user?.role === "buyer" ? "Request Delivery" : "Login as Buyer to Order"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
