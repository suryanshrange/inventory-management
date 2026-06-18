import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Upload, Download, MoreVertical, FileSpreadsheet, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const blank = {
  sku: "", name: "", description: "", category_id: "", supplier_id: "",
  cost_price: 0, selling_price: 0, quantity: 0, reorder_level: 10, barcode: "",
};

const stockBadge = (p) => {
  if (p.quantity === 0) return <Badge variant="destructive" data-testid={`stock-out-${p.id}`}>Out</Badge>;
  if (p.quantity <= p.reorder_level) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300">Low</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">In Stock</Badge>;
};

export default function Products() {
  const { can } = useAuth();
  const writable = can("admin", "manager");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [cats, setCats] = useState([]);
  const [sups, setSups] = useState([]);
  const [selected, setSelected] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const importInputRef = useRef(null);

  const fetchAll = async () => {
    setLoading(true);
    const params = { page, limit, search: search || undefined };
    if (categoryId !== "all") params.category_id = categoryId;
    if (stockStatus !== "all") params.stock_status = stockStatus;
    const { data } = await api.get("/products", { params });
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data));
    api.get("/suppliers").then((r) => setSups(r.data));
  }, []);

  useEffect(() => {
    fetchAll();
    // fetchAll captures filters via closure; safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryId, stockStatus]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchAll(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => { setEditing(null); setForm(blank); setDialogOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, description: p.description || "",
      category_id: p.category_id || "", supplier_id: p.supplier_id || "",
      cost_price: p.cost_price, selling_price: p.selling_price,
      quantity: p.quantity, reorder_level: p.reorder_level, barcode: p.barcode || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      quantity: Number(form.quantity),
      reorder_level: Number(form.reorder_level),
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success("Deleted");
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Delete failed"); }
  };

  const bulkDelete = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return toast.error("No products selected");
    if (!window.confirm(`Delete ${ids.length} products?`)) return;
    await api.post("/products/bulk-delete", { ids });
    toast.success(`Deleted ${ids.length}`);
    setSelected({});
    fetchAll();
  };

  const exportXlsx = async () => {
    const res = await api.get("/products/export/excel", { responseType: "blob" });
    downloadBlob(res.data, "products.xlsx");
  };
  const exportPdf = async () => {
    const res = await api.get("/products/export/pdf", { responseType: "blob" });
    downloadBlob(res.data, "products.pdf");
  };
  const downloadBlob = (blob, name) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    window.URL.revokeObjectURL(url);
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/products/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Imported ${data.created}, skipped ${data.skipped}`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    }
    e.target.value = "";
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const catName = (id) => cats.find((c) => c.id === id)?.name || "—";
  const supName = (id) => sups.find((s) => s.id === id)?.name || "—";

  return (
    <div className="space-y-6" data-testid="products-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Catalog</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your inventory items — search, filter, import & export.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {writable && (
            <>
              <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
              <Button variant="outline" onClick={() => importInputRef.current?.click()} data-testid="import-btn">
                <Upload className="h-4 w-4 mr-2" /> Import
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="export-btn"><Download className="h-4 w-4 mr-2" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportXlsx} data-testid="export-xlsx"><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf} data-testid="export-pdf"><FileText className="h-4 w-4 mr-2" /> PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {writable && (
            <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-product-btn">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          )}
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <div className="p-4 flex flex-wrap gap-3 items-center border-b border-border">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, barcode" className="pl-9" data-testid="search-input" />
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[180px]" data-testid="filter-category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stockStatus} onValueChange={setStockStatus}>
            <SelectTrigger className="w-[160px]" data-testid="filter-stock"><SelectValue placeholder="Stock" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          {writable && Object.values(selected).some(Boolean) && (
            <Button variant="destructive" onClick={bulkDelete} data-testid="bulk-delete-btn">
              <Trash2 className="h-4 w-4 mr-2" /> Delete selected
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">{total} products</div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {writable && <TableHead className="w-10"></TableHead>}
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skel-prod-${i}`}><TableCell colSpan={10}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No products found.</TableCell></TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id} className="table-row-hover" data-testid={`product-row-${p.id}`}>
                  {writable && (
                    <TableCell>
                      <Checkbox
                        checked={!!selected[p.id]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.id]: !!v }))}
                        data-testid={`select-${p.id}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{catName(p.category_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{supName(p.supplier_id)}</TableCell>
                  <TableCell className="text-right font-mono">{p.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{p.reorder_level}</TableCell>
                  <TableCell className="text-right font-mono">${Number(p.selling_price).toFixed(2)}</TableCell>
                  <TableCell>{stockBadge(p)}</TableCell>
                  <TableCell>
                    {writable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`actions-${p.id}`}><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => remove(p)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="p-4 flex items-center justify-between border-t border-border">
          <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="prev-page">Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} data-testid="next-page">Next</Button>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>SKU *</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} data-testid="form-sku" /></div>
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-name" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="form-description" /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="form-category"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={form.supplier_id || "none"} onValueChange={(v) => setForm({ ...form, supplier_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="form-supplier"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {sups.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cost Price</Label><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} data-testid="form-cost" /></div>
            <div className="space-y-2"><Label>Selling Price</Label><Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} data-testid="form-price" /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="form-qty" /></div>
            <div className="space-y-2"><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} data-testid="form-reorder" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Barcode</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} data-testid="form-barcode" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="form-save">
              {editing ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
