import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Package, Tag, Truck, AlertTriangle, XCircle, DollarSign, Activity,
  TrendingUp, ArrowUpRight, Boxes, Sparkles, Users, ShoppingCart,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area,
} from "recharts";
import Tilt3D from "@/components/Tilt3D";
import WarehouseMap3D from "@/components/WarehouseMap3D";
import RecentActivity from "@/components/RecentActivity";
import { useCountUp } from "@/hooks/useCountUp";
import { useTransactionFeed } from "@/hooks/useTransactionFeed";

const KPI = [
  { key: "total_products", label: "Total Products", icon: Package, color: "emerald", gradient: "from-emerald-500/20 to-emerald-500/0" },
  { key: "total_customers", label: "Customers", icon: Users, color: "blue", gradient: "from-blue-500/20 to-blue-500/0" },
  { key: "total_orders", label: "Orders", icon: ShoppingCart, color: "violet", gradient: "from-violet-500/20 to-violet-500/0" },
  { key: "low_stock", label: "Low Stock", icon: AlertTriangle, color: "amber", gradient: "from-amber-500/20 to-amber-500/0" },
  { key: "out_of_stock", label: "Out of Stock", icon: XCircle, color: "red", gradient: "from-red-500/20 to-red-500/0" },
  { key: "inventory_value", label: "Inventory Value", icon: DollarSign, color: "emerald", gradient: "from-emerald-500/20 to-emerald-500/0", isCurrency: true },
  { key: "todays_transactions", label: "Today's Tx", icon: Activity, color: "cyan", gradient: "from-cyan-500/20 to-cyan-500/0" },
];

const PIE_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#A855F7", "#06B6D4", "#EC4899", "#EF4444"];

const colorClasses = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  cyan: "text-cyan-600 dark:text-cyan-400",
};

function KpiCard({ item, value, index }) {
  const animated = useCountUp(value, 1200);
  const display = item.isCurrency
    ? `$${Math.round(animated).toLocaleString()}`
    : Math.round(animated).toLocaleString();
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.45, ease: "easeOut" }}
    >
      <Tilt3D max={6} className="kpi-card group" data-testid={`kpi-${item.key}`}>
        <div className="kpi-glow" />
        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className={`h-9 w-9 rounded-lg bg-secondary flex items-center justify-center ${colorClasses[item.color]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <ArrowUpRight className={`h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all ${colorClasses[item.color]}`} />
          </div>
          <div className="text-3xl font-display font-extrabold mt-4 tracking-tight">{display}</div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1 font-medium">{item.label}</div>
        </div>
      </Tilt3D>
    </motion.div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const txEvents = useTransactionFeed(4000);

  useEffect(() => {
    Promise.all([
      api.get("/reports/dashboard").then((r) => setData(r.data)),
      api.get("/products", { params: { limit: 64 } }).then((r) => setProducts(r.data.items || [])),
    ]).finally(() => setLoading(false));
  }, []);

  // Re-fetch products when new transactions arrive so quantities & colors update
  useEffect(() => {
    if (txEvents.length === 0) return;
    api.get("/products", { params: { limit: 64 } }).then((r) => setProducts(r.data.items || []));
    api.get("/reports/dashboard").then((r) => setData(r.data));
  }, [txEvents.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={`skel-kpi-${i}`} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const k = data?.kpi || {};
  const now = new Date().toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="space-y-8 relative" data-testid="dashboard-page">
      {/* HERO BANNER */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-900 text-white"
      >
        <div className="aurora aurora-soft" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-10 top-1/2 -translate-y-1/2 hidden md:block">
          {/* Floating 3D crates */}
          <div className="relative" style={{ width: 280, height: 220, perspective: "800px" }}>
            <div className="floating-shape emerald" style={{ top: 20, left: 50, width: 70, height: 70 }} />
            <div className="floating-shape cyan" style={{ top: 90, left: 130, width: 56, height: 56, animationDelay: "-3s" }} />
            <div className="floating-shape violet" style={{ top: 40, left: 190, width: 64, height: 64, animationDelay: "-6s" }} />
            <div className="floating-shape amber" style={{ top: 130, left: 70, width: 48, height: 48, animationDelay: "-2s" }} />
          </div>
        </div>

        <div className="relative p-8 md:p-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300/90 mb-3">
            <span className="pulse-dot" /> Live · {now}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Operations <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">Cockpit</span>
          </h1>
          <p className="text-white/70 text-sm md:text-base mt-2 max-w-xl">
            A real-time snapshot of inventory health, supplier flow, and stock movement — all in one view.
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 backdrop-blur">
              <Sparkles className="h-3 w-3 mr-1" /> {k.total_products} SKUs tracked
            </Badge>
            <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 backdrop-blur">
              <Boxes className="h-3 w-3 mr-1" /> ${Number(k.inventory_value || 0).toLocaleString()} in stock
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 backdrop-blur">
              <AlertTriangle className="h-3 w-3 mr-1" /> {k.low_stock} low stock alerts
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {KPI.map((item, i) => <KpiCard key={item.key} item={item} value={k[item.key] || 0} index={i} />)}
      </div>

      {/* 3D WAREHOUSE MAP + RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}
        >
          <WarehouseMap3D products={products} events={txEvents} />
        </motion.div>
        <RecentActivity />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="lg:col-span-2 border border-border rounded-2xl p-6 bg-card relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="flex items-center justify-between mb-4 relative">
            <div>
              <h3 className="font-display font-bold text-lg">Stock Movement Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 14 days · Stock-In vs Stock-Out</p>
            </div>
            <Badge variant="outline" className="text-xs">14d</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.stock_trend}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} />
              <Area type="monotone" dataKey="stock_in" stroke="#10B981" fill="url(#gIn)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="stock_out" stroke="#EF4444" fill="url(#gOut)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
          className="border border-border rounded-2xl p-6 bg-card relative overflow-hidden"
        >
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl" />
          <h3 className="font-display font-bold text-lg relative">Category Mix</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Products by category</p>
          {data.category_distribution.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-sm text-muted-foreground">
              <Tag className="h-8 w-8 opacity-30 mb-2" />
              No categories yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.category_distribution} dataKey="value" nameKey="name"
                  innerRadius={55} outerRadius={92} paddingAngle={3}
                  stroke="hsl(var(--card))" strokeWidth={2}
                >
                  {data.category_distribution.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[data.category_distribution.indexOf(entry) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
          className="border border-border rounded-2xl p-6 bg-card relative overflow-hidden"
        >
          <div className="absolute -top-10 right-10 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="flex items-center justify-between mb-4 relative">
            <div>
              <h3 className="font-display font-bold text-lg">Monthly Product Growth</h3>
              <p className="text-xs text-muted-foreground mt-0.5">New products onboarded per month</p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthly_growth}>
              <defs>
                <linearGradient id="bMonth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Bar dataKey="products" fill="url(#bMonth)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
          className="border border-border rounded-2xl p-6 bg-card relative overflow-hidden"
        >
          <div className="absolute -top-10 left-10 w-40 h-40 rounded-full bg-violet-500/5 blur-3xl" />
          <h3 className="font-display font-bold text-lg relative">Supplier Contribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Products supplied per partner</p>
          {data.supplier_contribution.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-sm text-muted-foreground">
              <Truck className="h-8 w-8 opacity-30 mb-2" />
              No supplier data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.supplier_contribution} layout="vertical">
                <defs>
                  <linearGradient id="bSup" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="value" fill="url(#bSup)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </div>
  );
}
