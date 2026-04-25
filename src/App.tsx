import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";

// Lazy-load non-critical routes so the home page ships the smallest possible JS bundle.
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min before refetch
      gcTime: 30 * 60 * 1000,         // 30 min cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            {/* Root redirects to portfolio basename (URL changes) */}
            <Route path="/" element={<Navigate to={import.meta.env.VITE_APP_BASENAME || "/myportfolio"} replace />} />
            {/* Portfolio home */}
            <Route path={import.meta.env.VITE_APP_BASENAME || "/myportfolio"} element={<Index />} />
            <Route path={`${import.meta.env.VITE_APP_BASENAME || "/myportfolio"}/project/:id`} element={<ProjectDetail />} />
            <Route path={`${import.meta.env.VITE_APP_BASENAME || "/myportfolio"}/admin/login`} element={<AdminLogin />} />
            <Route path={`${import.meta.env.VITE_APP_BASENAME || "/myportfolio"}/admin`} element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
