import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Tag, Truck, AlertTriangle, XCircle, DollarSign, Activity, TrendingUp,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area,
} from "recharts";

const KPI = [
  { key: "total_products", label: "Total Products", icon: Package, color: "text-emerald-600" },
  { key: "total_categories", label: "Categories", icon: Tag, color: "text-blue-600" },
  { key: "total_suppliers", label: "Suppliers", icon: Truck, color: "text-violet-600" },
  { key: "low_stock", label: "Low Stock", icon: AlertTriangle, color: "text-amber-600" },
  { key: "out_of_stock", label: "Out of Stock", icon: XCircle, color: "text-red-600" },
  { key: "inventory_value", label: "Inventory Value", icon: DollarSign, color: "text-emerald-600", isCurrency: true },
  { key: "todays_transactions", label: "Today's Tx", icon: Activity, color: "text-cyan-600" },
];

const PIE_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#A855F7", "#EF4444", "#06B6D4", "#EC4899"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/dashboard")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const k = data?.kpi || {};

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="fade-up">
        <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Overview</div>
        <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">A live snapshot of your inventory health.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {KPI.map((item, i) => {
          const Icon = item.icon;
          const value = k[item.key] ?? 0;
          return (
            <div key={item.key} className={`kpi-card fade-up-${(i % 5) + 1}`} data-testid={`kpi-${item.key}`}>
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <TrendingUp className="h-3 w-3 text-emerald-500 opacity-60" />
              </div>
              <div className="text-2xl font-display font-bold mt-3">
                {item.isCurrency ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString()}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-border rounded-lg p-6 bg-card fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Stock Movement Trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days · Stock-In vs Stock-Out</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.stock_trend}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Area type="monotone" dataKey="stock_in" stroke="#10B981" fill="url(#gIn)" strokeWidth={2} />
              <Area type="monotone" dataKey="stock_out" stroke="#EF4444" fill="url(#gOut)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card fade-up-4">
          <h3 className="font-display font-semibold mb-1">Category Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Products by category</p>
          {data.category_distribution.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.category_distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {data.category_distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-6 bg-card fade-up-5">
          <h3 className="font-display font-semibold mb-1">Monthly Product Growth</h3>
          <p className="text-xs text-muted-foreground mb-4">New products onboarded by month</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthly_growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="products" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card fade-up-5">
          <h3 className="font-display font-semibold mb-1">Supplier Contribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Products supplied by partner</p>
          {data.supplier_contribution.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No supplier data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.supplier_contribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
