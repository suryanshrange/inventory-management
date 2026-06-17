import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Sparkles, ArrowRight, ShieldCheck, BoxesIcon, Activity } from "lucide-react";
import HeroScene3D from "@/components/HeroScene3D";

export default function Login() {
  const [email, setEmail] = useState("admin@inventory.com");
  const [password, setPassword] = useState("Admin@123");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back");
      nav(loc.state?.from?.pathname || "/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const quick = (e, p) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] bg-background overflow-hidden" data-testid="login-page">
      {/* LEFT: Form */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex items-center justify-center p-6 sm:p-12"
      >
        <div className="aurora aurora-soft" />
        <div className="absolute inset-0 bg-grid-dark opacity-[0.04] pointer-events-none" />
        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="relative">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/30 logo-3d">IO</div>
              <div className="absolute inset-0 rounded-xl bg-emerald-500/40 blur-xl -z-10" />
            </div>
            <div>
              <div className="font-display font-bold text-lg">Inventory Ops</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1">
                <span className="pulse-dot" /> Enterprise Cockpit
              </div>
            </div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="font-display text-4xl font-extrabold tracking-tight"
          >
            Welcome <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent">back</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="text-sm text-muted-foreground mt-2 mb-8"
          >
            Real-time stock, role-based control, audit-grade compliance.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            onSubmit={submit} className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                <Input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 bg-card border-border focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
                  data-testid="login-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                <Input
                  id="password" type={show ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 h-11 bg-card border-border focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
                  data-testid="login-password"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="toggle-password">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit" disabled={busy}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shine font-medium group"
              data-testid="login-submit"
            >
              {busy ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" /></>)}
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className="text-sm text-muted-foreground mt-6"
          >
            New to Inventory Ops?{" "}
            <Link to="/register" className="text-emerald-600 hover:underline font-medium" data-testid="link-register">Create an account</Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="mt-8 p-4 rounded-xl border border-border/70 bg-card/40 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Quick sign-in (demo)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Admin", e: "admin@inventory.com", p: "Admin@123" },
                { l: "Manager", e: "manager@inventory.com", p: "Manager@123" },
                { l: "Staff", e: "staff@inventory.com", p: "Staff@123" },
              ].map((r) => (
                <button
                  key={r.l} type="button" onClick={() => quick(r.e, r.p)}
                  data-testid={`quick-${r.l.toLowerCase()}`}
                  className="px-3 py-2 rounded-md text-xs border border-border/70 hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-colors text-foreground"
                >
                  {r.l}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* RIGHT: 3D hero */}
      <div className="relative hidden lg:block overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900">
        <HeroScene3D />
        <div className="absolute inset-0 bg-grain opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300/90"
          >
            <span className="pulse-dot" /> Live · Operations Layer
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="max-w-lg"
          >
            <h2 className="font-display text-5xl font-extrabold leading-[1.05] mb-5">
              Every <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">SKU</span>, every movement, every shipment.
            </h2>
            <p className="text-white/75 text-base leading-relaxed mb-8 max-w-md">
              An immersive operations cockpit for modern warehouses — built on real-time data, intuitive design, and audit-grade compliance.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { icon: BoxesIcon, label: "Live SKU tracking", k: "Real-time" },
                { icon: ShieldCheck, label: "RBAC + Audit", k: "Secure" },
                { icon: Activity, label: "KPI dashboards", k: "Insightful" },
              ].map((f) => (
                <div key={f.k} className="glass-dark rounded-lg p-3 text-white/90">
                  <f.icon className="h-4 w-4 text-emerald-300 mb-2" />
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">{f.k}</div>
                  <div className="text-xs text-white/80 mt-0.5">{f.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
