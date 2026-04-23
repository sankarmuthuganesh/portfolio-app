import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin, isAdmin } from "@/lib/portfolio";
import { cleanupAdminVisits } from "@/lib/supabase";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const AdminLogin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isAdmin().then((loggedIn) => {
      if (loggedIn) navigate("/admin");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!password) {
      toast.error("Please enter password");
      return;
    }

    if (!ADMIN_EMAIL) {
      toast.error("Admin email not configured (VITE_ADMIN_EMAIL)");
      return;
    }

    setLoading(true);
    try {
      const result = await loginAdmin(ADMIN_EMAIL, password);
      if (result.success) {
        // Remove any visit rows logged from this browser before login
        cleanupAdminVisits().catch(() => {});
        toast.success("Welcome back!");
        navigate("/admin");
      } else {
        toast.error(result.error || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background hero-bg">
      <SiteHeader />
      <main className="container pt-32 max-w-md">
        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 space-y-6 card-shadow animate-scale-in">
          <div className="text-center space-y-2">
            <div className="inline-flex w-14 h-14 rounded-2xl gradient-bg items-center justify-center glow">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter password to manage your portfolio</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full gradient-bg text-primary-foreground border-0 hover:opacity-90 smooth"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default AdminLogin;