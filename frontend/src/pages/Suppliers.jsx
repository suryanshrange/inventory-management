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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const blank = { name: "", email: "", phone: "", address: "", gst_number: "", company_name: "", status: "active" };

export default function Suppliers() {
  const { can } = useAuth();
  const writable = can("admin", "manager");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [detail, setDetail] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await api.get("/suppliers");
    setItems(data); setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setDialogOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setDialogOpen(true); };

  const save = async () => {
    try {
      if (editing) await api.put(`/suppliers/${editing.id}`, form);
      else await api.post("/suppliers", form);
      toast.success(editing ? "Updated" : "Created");
      setDialogOpen(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Save failed"); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    await api.delete(`/suppliers/${s.id}`);
    toast.success("Deleted");
    fetchAll();
  };

  const openDetail = async (s) => {
    const { data } = await api.get(`/suppliers/${s.id}`);
    setDetail(data);
  };

  return (
    <div className="space-y-6" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Network</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-1">Track partners, history & performance.</p>
        </div>
        {writable && (
          <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-supplier-btn">
            <Plus className="h-4 w-4 mr-2" /> New Supplier
          </Button>
        )}
      </div>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`skel-sup-${i}`}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No suppliers yet.</TableCell></TableRow>
            ) : items.map((s) => (
              <TableRow key={s.id} className="table-row-hover" data-testid={`supplier-row-${s.id}`}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-sm">{s.company_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.phone}</TableCell>
                <TableCell className="text-xs font-mono">{s.gst_number}</TableCell>
                <TableCell>
                  <Badge className={s.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDetail(s)} data-testid={`view-sup-${s.id}`}><Eye className="h-4 w-4" /></Button>
                    {writable && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`edit-sup-${s.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(s)} data-testid={`delete-sup-${s.id}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Supplier" : "New Supplier"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="sup-form-name" /></div>
            <div className="space-y-2"><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} data-testid="sup-form-company" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="sup-form-email" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="sup-form-phone" /></div>
            <div className="space-y-2"><Label>GST Number</Label><Input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} data-testid="sup-form-gst" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="sup-form-address" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="sup-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">{detail.supplier.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Company" value={detail.supplier.company_name} />
                  <Info label="Email" value={detail.supplier.email} />
                  <Info label="Phone" value={detail.supplier.phone} />
                  <Info label="GST" value={detail.supplier.gst_number} />
                  <Info label="Address" value={detail.supplier.address} full />
                </div>

                <div>
                  <h3 className="font-display font-semibold text-sm mb-2">Products Supplied ({detail.products.length})</h3>
                  <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                    {detail.products.length === 0
                      ? <div className="p-4 text-sm text-muted-foreground">No products linked.</div>
                      : detail.products.map((p) => (
                        <div key={p.id} className="flex justify-between p-2 border-b border-border last:border-0 text-sm">
                          <div>{p.name} <span className="font-mono text-xs text-muted-foreground">({p.sku})</span></div>
                          <div className="text-muted-foreground">Qty {p.quantity}</div>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-sm mb-2">Recent Transactions ({detail.transactions.length})</h3>
                  <div className="border border-border rounded-md max-h-64 overflow-y-auto">
                    {detail.transactions.length === 0
                      ? <div className="p-4 text-sm text-muted-foreground">No transactions yet.</div>
                      : detail.transactions.map((t) => (
                        <div key={t.id} className="p-2 border-b border-border last:border-0 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">{t.action} · {t.product_name}</span>
                            <span className={t.quantity_change > 0 ? "text-emerald-600" : "text-red-600"}>{t.quantity_change > 0 ? "+" : ""}{t.quantity_change}</span>
                          </div>
                          <div className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const Info = ({ label, value, full }) => (
  <div className={full ? "col-span-2" : ""}>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-1">{value || "—"}</div>
  </div>
);
