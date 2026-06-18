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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const blank = { name: "", description: "", status: "active" };

export default function Categories() {
  const { can } = useAuth();
  const writable = can("admin", "manager");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await api.get("/categories");
    setItems(data); setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, description: c.description || "", status: c.status }); setDialogOpen(true); };

  const save = async () => {
    try {
      if (editing) await api.put(`/categories/${editing.id}`, form);
      else await api.post("/categories", form);
      toast.success(editing ? "Updated" : "Created");
      setDialogOpen(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Save failed"); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    await api.delete(`/categories/${c.id}`);
    toast.success("Deleted");
    fetchAll();
  };

  return (
    <div className="space-y-6" data-testid="categories-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Catalog</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize products into logical groups.</p>
        </div>
        {writable && (
          <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-category-btn">
            <Plus className="h-4 w-4 mr-2" /> New Category
          </Button>
        )}
      </div>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`skel-cat-${i}`}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No categories. Add one to get started.</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow key={c.id} className="table-row-hover" data-testid={`category-row-${c.id}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-md truncate">{c.description}</TableCell>
                <TableCell>
                  <Badge className={c.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}>
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {writable && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} data-testid={`edit-cat-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c)} data-testid={`delete-cat-${c.id}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="cat-form-name" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="cat-form-desc" /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="cat-form-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="cat-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
