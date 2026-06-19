import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Mail, Phone, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const blank = { full_name: "", email: "", phone: "", address: "" };

export default function Customers() {
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/customers");
    setItems(data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ full_name: c.full_name, email: c.email, phone: c.phone || "", address: c.address || "" });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form);
      else await api.post("/customers", form);
      toast.success(editing ? "Customer updated" : "Customer created");
      setOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.full_name}"? Their orders will also be deleted.`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      toast.success("Customer deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const filtered = items.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.full_name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s);
  });

  const initials = (name) => name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">CRM</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage customer records and contact details.</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-customer-btn">
          <Plus className="h-4 w-4 mr-2" /> New Customer
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-9" data-testid="customer-search" />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} of {items.length} customers</div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`skel-cust-${i}`}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No customers found.</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="table-row-hover" data-testid={`customer-row-${c.id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-border">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs">{initials(c.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{c.full_name}</div>
                      <div className="text-[10px] text-muted-foreground">Since {new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><div className="flex items-center gap-1.5 text-sm"><Mail className="h-3 w-3 text-muted-foreground" />{c.email}</div></TableCell>
                <TableCell><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{c.phone || "—"}</div></TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.address || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} data-testid={`edit-cust-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                    {can("admin", "manager") && (
                      <Button variant="ghost" size="icon" onClick={() => remove(c)} data-testid={`delete-cust-${c.id}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
            <DialogDescription>{editing ? "Update customer details." : "Add a new customer to your CRM."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="cust-form-name" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="cust-form-email" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="cust-form-phone" /></div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="cust-form-address" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="cust-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
