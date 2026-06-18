import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownToLine, ArrowUpFromLine, Plus, Mail, ArrowRight, Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function RecentActivity() {
  const { can } = useAuth();
  const [items, setItems] = useState(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await api.get("/inventory/history", { params: { limit: 12 } });
    setItems(data);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, []);

  const sendAlert = async () => {
    setSending(true);
    try {
      const { data } = await api.post("/reports/low-stock/send-alert");
      toast.success(data.message || `Alert sent to ${data.recipient}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setSending(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="border border-border rounded-2xl bg-card overflow-hidden flex flex-col"
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold">Recent Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Live stock movement feed</p>
        </div>
        <Badge variant="outline" className="text-[10px] flex items-center gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
          <span className="pulse-dot" /> Live
        </Badge>
      </div>

      {/* Quick actions */}
      {can("admin", "manager") && (
        <div className="px-5 pb-3 grid grid-cols-2 gap-2">
          <Link to="/inventory" className="col-span-1">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9 hover:bg-emerald-50 hover:border-emerald-500/40 dark:hover:bg-emerald-950/30" data-testid="quick-stock-in">
              <ArrowDownToLine className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Stock In
            </Button>
          </Link>
          <Link to="/inventory" className="col-span-1">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9 hover:bg-red-50 hover:border-red-500/40 dark:hover:bg-red-950/30" data-testid="quick-stock-out">
              <ArrowUpFromLine className="h-3.5 w-3.5 mr-2 text-red-600" /> Stock Out
            </Button>
          </Link>
          <Link to="/products" className="col-span-1">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9" data-testid="quick-add-product">
              <Plus className="h-3.5 w-3.5 mr-2" /> Add Product
            </Button>
          </Link>
          <Button
            variant="outline" size="sm"
            onClick={sendAlert} disabled={sending}
            className="w-full justify-start text-xs h-9 hover:bg-amber-50 hover:border-amber-500/40 dark:hover:bg-amber-950/30"
            data-testid="quick-alert"
          >
            <Mail className="h-3.5 w-3.5 mr-2 text-amber-600" /> {sending ? "Sending…" : "Send Alert"}
          </Button>
        </div>
      )}

      <ScrollArea className="h-[360px] border-t border-border">
        {items === null ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={`skel-act-${i}`} className="h-12" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground p-8">
            <Clock className="h-8 w-8 opacity-30 mb-2" />
            No activity yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.02 * i }}
                className="px-5 py-3 flex items-start gap-3 hover:bg-secondary/40 transition-colors"
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  h.action === "stock_in"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}>
                  {h.action === "stock_in" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{h.product_name}</span>
                    <span className={`text-sm font-mono font-semibold ${h.quantity_change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {h.quantity_change > 0 ? "+" : ""}{h.quantity_change}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{h.user_name}</span>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(h.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Link
        to="/inventory" className="px-5 py-3 border-t border-border text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/5 transition-colors flex items-center justify-between"
        data-testid="view-all-activity"
      >
        <span>View full history</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}
