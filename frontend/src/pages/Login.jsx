import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

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
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background" data-testid="login-page">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-md bg-emerald-500 flex items-center justify-center text-white font-bold">IO</div>
            <div>
              <div className="font-display font-bold">Inventory Ops</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Enterprise Platform</div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-8">Sign in to manage your inventory operations.</p>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  data-testid="login-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password" type={show ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  data-testid="login-password"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="toggle-password">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={busy} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="login-submit">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-emerald-600 hover:underline font-medium" data-testid="link-register">Create one</Link>
          </p>

          <div className="mt-8 p-4 rounded-md border border-border bg-secondary/40 text-xs space-y-1">
            <div className="font-semibold text-foreground">Demo credentials</div>
            <div>admin@inventory.com · Admin@123</div>
            <div>manager@inventory.com · Manager@123</div>
            <div>staff@inventory.com · Staff@123</div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjB3YXJlaG91c2UlMjBsb2dpc3RpY3N8ZW58MHx8fHwxNzgxNzE5MjI3fDA&ixlib=rb-4.1.0&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/85 via-slate-900/70 to-emerald-900/40" />
        <div className="absolute inset-0 bg-grain opacity-30" />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <div className="max-w-md">
            <div className="text-xs uppercase tracking-widest text-emerald-300 mb-3">Built for warehouses that scale</div>
            <h2 className="font-display text-4xl font-bold leading-tight mb-4">
              Track every SKU, every movement, every shipment.
            </h2>
            <p className="text-white/80">
              Real-time stock visibility, role-based control, and audit-grade compliance — all in one operations cockpit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
