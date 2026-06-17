import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;
  const initials = (user.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-3xl space-y-6" data-testid="profile-page">
      <div>
        <div className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Account</div>
        <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Profile</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-emerald-500 text-white text-2xl font-display">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-display text-2xl font-bold">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <Badge className="mt-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase tracking-wider">{user.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Account details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Row label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <Row label="Role" value={user.role} />
          <Row label="Email" value={user.email} />
          <Row label="Member since" value={new Date(user.created_at).toLocaleDateString()} />
        </CardContent>
      </Card>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-1">{value || "—"}</div>
  </div>
);
