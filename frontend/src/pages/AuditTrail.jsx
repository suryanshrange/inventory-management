import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet } from "lucide-react";

const ACTIONS = ["all", "create", "update", "delete", "login", "logout", "stock_in", "stock_out", "register"];

const actionColor = (a) =>
  a.startsWith("stock_in") ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    : a.startsWith("stock_out") ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    : a === "delete" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    : a === "create" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    : a === "login" || a === "register" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

export default function AuditTrail() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("all");

  const fetchAll = async () => {
    setLoading(true);
    const params = {};
    if (action !== "all") params.action = action;
    const { data } = await api.get("/audit-logs", { params });
    setItems(data); setLoading(false);
  };
  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [action]);

  const exportExcel = async () => {
    const res = await api.get("/reports/export/excel", { params: { report: "audit" }, responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = "audit.xlsx"; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Compliance</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">Every system action — recorded, traceable, exportable.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[180px]" data-testid="audit-filter"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportExcel} data-testid="audit-export">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={`skel-audit-${i}`}><TableCell colSpan={5}><Skeleton className="h-7 w-full" /></TableCell></TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No audit events yet.</TableCell></TableRow>
            ) : items.map((l) => (
              <TableRow key={l.id} className="table-row-hover" data-testid={`audit-row-${l.id}`}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{l.user_name}</TableCell>
                <TableCell><Badge className={actionColor(l.action)}>{l.action}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground capitalize">{l.entity}</TableCell>
                <TableCell className="text-sm">{l.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
