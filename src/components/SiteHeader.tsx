import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isAdmin, logoutAdmin, onAuthStateChange } from "@/lib/portfolio";
import { LogOut, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const BASE = import.meta.env.VITE_APP_BASENAME || "/myportfolio";

export function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    isAdmin().then(setAdmin);
    const unsub = onAuthStateChange(setAdmin);
    return unsub;
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/95 border-b border-border shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.15)]">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <Link to={BASE} className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="gradient-text">Portfolio</span>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex items-center gap-2">
          {admin ? (
            <>
              {location.pathname !== `${BASE}/admin` && (
                <Button variant="ghost" size="sm" onClick={() => navigate(`${BASE}/admin`)}>
                  Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logoutAdmin();
                  setAdmin(false);
                  navigate(BASE);
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate(`${BASE}/admin/login`)}>
              Admin
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}