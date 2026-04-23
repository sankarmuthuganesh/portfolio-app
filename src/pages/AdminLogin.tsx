import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin, isAdmin } from "@/lib/portfolio";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    isAdmin().then((loggedIn) => {
      if (loggedIn) navigate("/admin");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await loginAdmin(email.trim(), password);
      if (result.success) {
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
            <p className="text-sm text-muted-foreground">Sign in to manage your portfolio</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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