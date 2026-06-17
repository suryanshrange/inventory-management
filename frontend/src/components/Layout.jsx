import { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Package, Tag, Truck, ArrowDownUp, FileBarChart2,
  ShieldCheck, LogOut, ChevronLeft, Search, Bell, User as UserIcon, Moon, Sun
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { to: "/products", label: "Products", icon: Package, key: "products" },
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

  const toggleTheme = () => {
    const el = document.documentElement;
    if (el.classList.contains("dark")) { el.classList.remove("dark"); setDark(false); }
    else { el.classList.add("dark"); setDark(true); }
  };

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`${collapsed ? "w-[68px]" : "w-[240px]"} shrink-0 border-r border-border bg-card transition-all duration-200 flex flex-col`}
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <div className="h-9 w-9 rounded-md bg-emerald-500 flex items-center justify-center text-white font-bold">
            IO
          </div>
          {!collapsed && (
            <div className="ml-3">
              <div className="font-display font-bold leading-tight">Inventory Ops</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Enterprise</div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.filter((n) => !n.roles || n.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              data-testid={`nav-${item.key}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="m-3 h-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 max-w-md w-full">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              data-testid="topbar-search"
              placeholder="Search products, suppliers…"
              className="bg-transparent outline-none text-sm placeholder:text-muted-foreground w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" data-testid="notifications-btn">
              <Bell className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu" className="flex items-center gap-2 pl-2 pr-3 h-10 rounded-md hover:bg-secondary transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-emerald-500 text-white text-xs">{initials}</AvatarFallback>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
