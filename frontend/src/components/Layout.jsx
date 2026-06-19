import { useState } from "react";
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Tag, Truck, ArrowDownUp, FileBarChart2,
  ShieldCheck, LogOut, ChevronLeft, Search, Bell, User as UserIcon, Moon, Sun, Sparkles,
  Users, ShoppingCart,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { to: "/products", label: "Products", icon: Package, key: "products" },
  { to: "/customers", label: "Customers", icon: Users, key: "customers" },
  { to: "/orders", label: "Orders", icon: ShoppingCart, key: "orders" },
  { to: "/categories", label: "Categories", icon: Tag, key: "categories" },
  { to: "/suppliers", label: "Suppliers", icon: Truck, key: "suppliers" },
  { to: "/inventory", label: "Inventory", icon: ArrowDownUp, key: "inventory" },
  { to: "/reports", label: "Reports", icon: FileBarChart2, key: "reports" },
  { to: "/audit", label: "Audit Trail", icon: ShieldCheck, key: "audit", roles: ["admin", "manager"] },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const toggleTheme = () => {
    const el = document.documentElement;
    if (el.classList.contains("dark")) { el.classList.remove("dark"); setDark(false); }
    else { el.classList.add("dark"); setDark(true); }
  };

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-hidden">
      {/* Global aurora background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="aurora aurora-soft" />
      </div>

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`${collapsed ? "w-[72px]" : "w-[248px]"} shrink-0 border-r border-border bg-card/70 backdrop-blur-md transition-all duration-300 flex flex-col relative z-20`}
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/30 logo-3d">
              IO
            </div>
            <div className="absolute inset-0 rounded-xl bg-emerald-500/30 blur-lg -z-10" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <div className="font-display font-bold leading-tight">Inventory Ops</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1">
                <span className="pulse-dot" /> Enterprise
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.filter((n) => !n.roles || n.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.key} to={item.to} data-testid={`nav-${item.key}`}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className="mx-3 mb-3 p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 relative overflow-hidden">
            <Sparkles className="h-4 w-4 text-emerald-500 mb-1" />
            <div className="text-xs font-semibold">Operations live</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">All systems nominal</div>
          </div>
        )}

        <button
          data-testid="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}
          className="m-3 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 max-w-md w-full">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              data-testid="topbar-search"
              placeholder="Search products, suppliers…"
              className="bg-transparent outline-none text-sm placeholder:text-muted-foreground w-full"
            />
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground bg-secondary">⌘K</kbd>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
              <span className="pulse-dot" /> Live
            </Badge>
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" data-testid="notifications-btn" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu" className="flex items-center gap-2 pl-2 pr-3 h-10 rounded-lg hover:bg-secondary transition-colors">
                  <Avatar className="h-7 w-7 ring-2 ring-emerald-500/30">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-medium leading-tight">{user?.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{user?.role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav("/profile")} data-testid="menu-profile">
                  <UserIcon className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => { await logout(); nav("/login"); }}
                  data-testid="menu-logout"
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto" data-testid="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
