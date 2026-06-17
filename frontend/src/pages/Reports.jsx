import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import { Mail, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Reports() {
  const { can } = useAuth();
  const [tab, setTab] = useState("low");
  const [low, setLow] = useState({ low_stock: [], out_of_stock: [] });
  const [monthly, setMonthly] = useState(null);
  const [tx, setTx] = useState({ items: [], count: 0 });
  const [txRange, setTxRange] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchLow = async () => { const { data } = await api.get("/reports/low-stock"); setLow(data); };
  const fetchMonthly = async () => { const { data } = await api.get("/reports/monthly"); setMonthly(data); };
  const fetchTx = async (range = txRange) => {
    const { data } = await api.get("/reports/transactions", { params: { range } });
    setTx(data);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLow(), fetchMonthly(), fetchTx()]).finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  const sendAlert = async () => {
    setSending(true);
    try {
      const { data } = await api.post("/reports/low-stock/send-alert");
      toast.success(data.message || `Alert sent to ${data.recipient}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send");
    } finally { setSending(false); }
  };

  const exportReport = async (report) => {
    const res = await api.get("/reports/export/excel", { params: { report }, responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = `${report}.xlsx`; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Insights</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate, export, and act on critical inventory data.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="low" data-testid="tab-low">Low Stock</TabsTrigger>
          <TabsTrigger value="tx" data-testid="tab-tx">Transactions</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
        </TabsList>

        {/* LOW STOCK */}
        <TabsContent value="low" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock Items</CardTitle>
                <CardDescription>Quantity at or below reorder level.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-32" /> : low.low_stock.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">Everything is well-stocked.</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {low.low_stock.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                        <div>
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{p.quantity} / {p.reorder_level}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /> Out of Stock</CardTitle>
                <CardDescription>Replenish these urgently.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-32" /> : low.out_of_stock.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">No stockouts.</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {low.out_of_stock.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                        <div>
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                        </div>
                        <Badge variant="destructive">Out</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {can("admin", "manager") && (
              <Button onClick={sendAlert} disabled={sending} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="send-alert-btn">
                <Mail className="h-4 w-4 mr-2" /> {sending ? "Sending…" : "Send Low-Stock Email Alert"}
              </Button>
            )}
            <Button variant="outline" onClick={() => exportReport("low_stock")} data-testid="export-low">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          </div>
        </TabsContent>

        {/* TRANSACTIONS */}
        <TabsContent value="tx" className="mt-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Select value={txRange} onValueChange={(v) => { setTxRange(v); fetchTx(v); }}>
              <SelectTrigger className="w-[200px]" data-testid="tx-range"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Last 24 hours</SelectItem>
                <SelectItem value="weekly">Last 7 days</SelectItem>
                <SelectItem value="monthly">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportReport("transactions")} data-testid="export-tx">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          </div>

          <div className="border border-border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tx.items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No transactions for this range.</TableCell></TableRow>
                ) : tx.items.map((h) => (
                  <TableRow key={h.id} className="table-row-hover">
                    <TableCell className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge className={h.action === "stock_in" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}>{h.action}</Badge></TableCell>
                    <TableCell className="font-medium">{h.product_name}</TableCell>
                    <TableCell className={`text-right font-mono ${h.quantity_change > 0 ? "text-emerald-600" : "text-red-600"}`}>{h.quantity_change > 0 ? "+" : ""}{h.quantity_change}</TableCell>
                    <TableCell>{h.user_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* MONTHLY */}
        <TabsContent value="monthly" className="mt-6 space-y-4">
          {!monthly ? <Skeleton className="h-40" /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="pt-6"><div className="text-xs uppercase tracking-wider text-muted-foreground">Month</div><div className="text-2xl font-display font-bold mt-1">{monthly.month}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-xs uppercase tracking-wider text-muted-foreground">Stock In Units</div><div className="text-2xl font-display font-bold mt-1 text-emerald-600">{monthly.stock_in_units}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-xs uppercase tracking-wider text-muted-foreground">Stock Out Units</div><div className="text-2xl font-display font-bold mt-1 text-red-600">{monthly.stock_out_units}</div></CardContent></Card>
              </div>
              <div className="text-sm text-muted-foreground">{monthly.total_transactions} transactions logged this month.</div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
