import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Eye, Ban, ShoppingCart, X, Package } from "lucide-react";

const statusColor = (s) => ({
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  fulfilled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
})[s] || "bg-slate-100 text-slate-700";

const fmt = (n) => `$${Number(n).toFixed(2)}`;

export default function Orders() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const [form, setForm] = useState({ customer_id: "", notes: "", items: [{ product_id: "", quantity: 1 }] });

  const load = async () => {
    setLoading(true);
    const [o, p, c] = await Promise.all([
      api.get("/orders"),
      api.get("/products", { params: { limit: 200 } }),
      api.get("/customers"),
    ]);
    setItems(o.data); setProducts(p.data.items); setCustomers(c.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ customer_id: "", notes: "", items: [{ product_id: "", quantity: 1 }] });
    setOpen(true);
  };

  const addLine = () => setForm({ ...form, items: [...form.items, { product_id: "", quantity: 1 }] });
  const removeLine = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateLine = (i, key, val) => {
    const arr = [...form.items];
    arr[i] = { ...arr[i], [key]: val };
    setForm({ ...form, items: arr });
  };

  const total = form.items.reduce((sum, line) => {
    const p = products.find((x) => x.id === line.product_id);
    return sum + (p ? p.selling_price * Number(line.quantity || 0) : 0);
  }, 0);

  const submit = async () => {
    if (!form.customer_id) return toast.error("Select a customer");
    const cleanItems = form.items.filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) }));
    if (cleanItems.length === 0) return toast.error("Add at least one product");
    try {
      const { data } = await api.post("/orders", {
        customer_id: form.customer_id,
        items: cleanItems,
        notes: form.notes,
      });
      toast.success(`Order ${data.order_number} created · ${fmt(data.total_amount)}`);
      setOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Order creation failed");
    }
  };

  const cancel = async (o) => {
    if (!window.confirm(`Cancel order ${o.order_number}? Stock will be returned to inventory.`)) return;
    try {
      await api.delete(`/orders/${o.id}`);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Cancellation failed");
    }
  };

  const openDetail = async (o) => {
    const { data } = await api.get(`/orders/${o.id}`);
    setDetail(data);
  };

  return (
    <div className="space-y-6" data-testid="orders-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Sales</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and track customer orders. Inventory auto-deducts on order.</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-order-btn">
          <Plus className="h-4 w-4 mr-2" /> New Order
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skel-ord-${i}`}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No orders yet — click <span className="text-emerald-600 font-medium">New Order</span> to start.
              </TableCell></TableRow>
            ) : items.map((o) => (
              <TableRow key={o.id} className="table-row-hover" data-testid={`order-row-${o.id}`}>
                <TableCell className="font-mono text-xs font-semibold">{o.order_number}</TableCell>
                <TableCell>{o.customer?.full_name || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.items.length} item{o.items.length !== 1 ? "s" : ""}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{fmt(o.total_amount)}</TableCell>
                <TableCell><Badge className={statusColor(o.status)}>{o.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDetail(o)} data-testid={`view-ord-${o.id}`}><Eye className="h-4 w-4" /></Button>
                    {o.status !== "cancelled" && (
                      <Button variant="ghost" size="icon" onClick={() => cancel(o)} data-testid={`cancel-ord-${o.id}`} title="Cancel order">
                        <Ban className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Order Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">New Order</DialogTitle>
            <DialogDescription>Inventory will be deducted automatically when the order is created.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger data-testid="order-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} · {c.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} data-testid="add-line-btn">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {form.items.map((line, i) => {
                  const p = products.find((x) => x.id === line.product_id);
                  return (
                    <div key={`line-${i}`} className="grid grid-cols-[1fr_100px_100px_40px] gap-2 items-center">
                      <Select value={line.product_id} onValueChange={(v) => updateLine(i, "product_id", v)}>
                        <SelectTrigger data-testid={`line-product-${i}`}><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} disabled={p.quantity === 0}>
                              {p.name} ({p.sku}) · {p.quantity} in stock
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min="1" max={p?.quantity || undefined}
                        value={line.quantity}
                        onChange={(e) => updateLine(i, "quantity", e.target.value)}
                        data-testid={`line-qty-${i}`}
                      />
                      <div className="text-sm text-right font-mono text-muted-foreground">
                        {p ? fmt(p.selling_price * Number(line.quantity || 0)) : "—"}
                      </div>
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => removeLine(i)} disabled={form.items.length === 1}
                        data-testid={`remove-line-${i}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Order Total</div>
                <div className="text-2xl font-display font-bold mt-0.5">{fmt(total)}</div>
              </div>
              <Package className="h-8 w-8 text-emerald-500/30" />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="order-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="order-submit">
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display flex items-center gap-3">
                  {detail.order_number}
                  <Badge className={statusColor(detail.status)}>{detail.status}</Badge>
                </SheetTitle>
                <SheetDescription>Created {new Date(detail.created_at).toLocaleString()}</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {detail.customer && (
                  <div className="p-4 rounded-xl border border-border bg-secondary/30">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</div>
                    <div className="font-medium mt-0.5">{detail.customer.full_name}</div>
                    <div className="text-xs text-muted-foreground">{detail.customer.email} · {detail.customer.phone}</div>
                  </div>
                )}

                <div>
                  <h3 className="font-display font-semibold text-sm mb-2">Items ({detail.items.length})</h3>
                  <div className="border border-border rounded-md">
                    {detail.items.map((it) => (
                      <div key={it.id} className="p-3 border-b border-border last:border-0 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{it.product_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{it.product_sku} · {fmt(it.unit_price)} × {it.quantity}</div>
                        </div>
                        <div className="font-mono text-sm font-semibold">{fmt(it.line_total)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-2xl font-display font-bold">{fmt(detail.total_amount)}</div>
                </div>

                {detail.notes && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm">{detail.notes}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
