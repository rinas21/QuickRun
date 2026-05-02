import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: number;
  sellerId: number;
  name: string;
  category: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemForm {
  name: string;
  category: string;
  description: string;
  price: string;
  quantity: string;
  unit: string;
  isAvailable: boolean;
  imageUrl: string;
}

const EMPTY_FORM: ItemForm = {
  name: "", category: "general", description: "", price: "",
  quantity: "0", unit: "pcs", isAvailable: true, imageUrl: "",
};

const CATEGORIES = ["electronics", "grocery", "pharmacy", "stationery", "general", "clothing", "furniture", "other"];

const CATEGORY_ICONS: Record<string, string> = {
  electronics: "💻", grocery: "🛒", pharmacy: "💊", stationery: "📝",
  general: "📦", clothing: "👕", furniture: "🛋️", other: "🏷️",
};

export default function SellerInventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-inventory"],
    queryFn: () => apiFetch<{ items: InventoryItem[]; total: number }>("/api/inventory/mine"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch<InventoryItem>("/api/inventory", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-inventory"] });
      setDialogOpen(false);
      toast({ title: "Item added to inventory" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiFetch<InventoryItem>(`/api/inventory/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-inventory"] });
      setDialogOpen(false);
      toast({ title: "Item updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/inventory/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-inventory"] });
      toast({ title: "Item removed" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) =>
      apiFetch(`/api/inventory/${id}`, { method: "PUT", body: JSON.stringify({ isAvailable }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-inventory"] }),
  });

  const openNew = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description ?? "",
      price: String(item.price),
      quantity: String(item.quantity),
      unit: item.unit,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const body = {
      name: form.name,
      category: form.category,
      description: form.description || undefined,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity, 10),
      unit: form.unit,
      isAvailable: form.isAvailable,
      imageUrl: form.imageUrl || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const items = data?.items ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> My Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the products you sell. Buyers can browse these on the Marketplace.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-primary">{items.length}</p>
          <p className="text-sm text-muted-foreground">Total Products</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-green-600">{items.filter((i) => i.isAvailable).length}</p>
          <p className="text-sm text-muted-foreground">Available</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-3xl font-bold text-muted-foreground">{items.filter((i) => !i.isAvailable).length}</p>
          <p className="text-sm text-muted-foreground">Hidden</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16 space-y-3">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <p className="text-lg font-semibold">No inventory yet</p>
          <p className="text-muted-foreground text-sm">Add your first product to appear on the Marketplace</p>
          <Button onClick={openNew} className="gap-2 mt-2">
            <Plus className="h-4 w-4" /> Add First Item
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card key={item.id} className={`flex flex-col border transition-all ${item.isAvailable ? "border-border" : "border-muted opacity-60"}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CATEGORY_ICONS[item.category] || "📦"}</span>
                      <h3 className="font-bold text-base truncate">{item.name}</h3>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs mt-1">{item.category}</Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-lg">Rs. {item.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">/{item.unit}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-2 flex-1">
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="font-medium">{item.quantity} {item.unit} in stock</span>
                </div>
              </CardContent>

              <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    title={item.isAvailable ? "Hide from marketplace" : "Show on marketplace"}
                  >
                    {item.isAvailable
                      ? <ToggleRight className="h-5 w-5 text-green-600" />
                      : <ToggleLeft className="h-5 w-5" />}
                    <span>{item.isAvailable ? "Visible" : "Hidden"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)} className="gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Product Name *</Label>
                <Input
                  placeholder="e.g. Samsung 870 EVO 1TB SSD"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {CATEGORY_ICONS[c]} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pcs", "kg", "g", "litre", "ml", "pack", "strips", "bottles", "reams", "boxes"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Price (LKR) *</Label>
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantity in Stock</Label>
                <Input
                  type="number" min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the product..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Image URL (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  checked={form.isAvailable}
                  onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
                  id="available-toggle"
                />
                <Label htmlFor="available-toggle">Show on Marketplace</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name || !form.price}>
              {isSaving ? "Saving..." : editItem ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
