import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("stock-in");
  const [loading, setLoading] = useState(true);

  const [stockInForm, setStockInForm] = useState({ product_id: "", quantity: 1, supplier_id: "", purchase_cost: 0, notes: "" });
  const [stockOutForm, setStockOutForm] = useState({ product_id: "", quantity: 1, destination: "", notes: "" });

  const fetchData = async () => {
    setLoading(true);
    const [p, s, h] = await Promise.all([
      api.get("/products", { params: { limit: 1000 } }),
      api.get("/suppliers"),
      api.get("/inventory/history", { params: { limit: 100 } }),
    ]);
    setProducts(p.data.items); setSuppliers(s.data); setHistory(h.data); setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const submitStockIn = async () => {
    if (!stockInForm.product_id) return toast.error("Select a product");
    try {
      await api.post("/inventory/stock-in", {
        ...stockInForm,
        quantity: Number(stockInForm.quantity),
        purchase_cost: Number(stockInForm.purchase_cost),
        supplier_id: stockInForm.supplier_id || null,
      });
      toast.success("Stock added");
      setStockInForm({ product_id: "", quantity: 1, supplier_id: "", purchase_cost: 0, notes: "" });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const submitStockOut = async () => {
    if (!stockOutForm.product_id) return toast.error("Select a product");
    try {
      await api.post("/inventory/stock-out", { ...stockOutForm, quantity: Number(stockOutForm.quantity) });
      toast.success("Stock removed");
      setStockOutForm({ product_id: "", quantity: 1, destination: "", notes: "" });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div>
        <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Movement</div>
        <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Inventory Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">Record stock-in & stock-out events. Every change is logged.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stock-in" data-testid="tab-stock-in"><ArrowDownToLine className="h-4 w-4 mr-2" /> Stock In</TabsTrigger>
          <TabsTrigger value="stock-out" data-testid="tab-stock-out"><ArrowUpFromLine className="h-4 w-4 mr-2" /> Stock Out</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-in" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Stock In</CardTitle>
              <CardDescription>Receive inventory from a supplier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={stockInForm.product_id} onValueChange={(v) => setStockInForm({ ...stockInForm, product_id: v })}>
                    <SelectTrigger data-testid="in-product"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku}) · Qty {p.quantity}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={stockInForm.supplier_id || "none"} onValueChange={(v) => setStockInForm({ ...stockInForm, supplier_id: v === "none" ? "" : v })}>
                    <SelectTrigger data-testid="in-supplier"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="1" value={stockInForm.quantity} onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })} data-testid="in-qty" /></div>
                <div className="space-y-2"><Label>Purchase Cost (per unit)</Label><Input type="number" step="0.01" value={stockInForm.purchase_cost} onChange={(e) => setStockInForm({ ...stockInForm, purchase_cost: e.target.value })} data-testid="in-cost" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={stockInForm.notes} onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })} data-testid="in-notes" /></div>
              </div>
              <Button onClick={submitStockIn} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="in-submit">
                <ArrowDownToLine className="h-4 w-4 mr-2" /> Add to inventory
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-out" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Stock Out</CardTitle>
              <CardDescription>Dispatch inventory to a destination.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={stockOutForm.product_id} onValueChange={(v) => setStockOutForm({ ...stockOutForm, product_id: v })}>
                    <SelectTrigger data-testid="out-product"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku}) · Qty {p.quantity}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="1" value={stockOutForm.quantity} onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })} data-testid="out-qty" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Destination</Label><Input value={stockOutForm.destination} onChange={(e) => setStockOutForm({ ...stockOutForm, destination: e.target.value })} placeholder="Customer / Branch / Other" data-testid="out-dest" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={stockOutForm.notes} onChange={(e) => setStockOutForm({ ...stockOutForm, notes: e.target.value })} data-testid="out-notes" /></div>
              </div>
              <Button onClick={submitStockOut} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="out-submit">
                <ArrowUpFromLine className="h-4 w-4 mr-2" /> Dispatch
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="border border-border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Prev → New</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skel-inv-${i}`}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : history.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No transactions logged yet.</TableCell></TableRow>
                ) : history.map((h) => (
                  <TableRow key={h.id} className="table-row-hover" data-testid={`log-row-${h.id}`}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={h.action === "stock_in"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}>
                        {h.action.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{h.product_name}</TableCell>
                    <TableCell className={`text-right font-mono ${h.quantity_change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {h.quantity_change > 0 ? "+" : ""}{h.quantity_change}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{h.previous_quantity} → {h.new_quantity}</TableCell>
                    <TableCell className="text-sm">{h.user_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{h.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
