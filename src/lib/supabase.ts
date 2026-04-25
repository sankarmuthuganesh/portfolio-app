import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Preconnect is handled in index.html via %VITE_SUPABASE_URL%

// =============================================================
// Visit auditing
// =============================================================

const VISITOR_KEY = "pf_visitor_id";

/** Stable per-browser anonymous id (used to clean up admin's pre-login visits) */
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/** Detect device type from user agent + screen width */
function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  // Tablets first (iPad, Android tablets)
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}

/** Track de-dup within the same tab to avoid duplicate inserts on re-render */
const sessionLogged = new Set<string>();

/**
 * Log a portfolio visit. Safe to call from useEffect — never throws.
 * Skips logging when an admin session is active.
 */
export async function logVisit(pageName: string): Promise<void> {
  try {
    if (!pageName) return;

    // Skip if admin is currently logged in
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) return;

    // Avoid duplicate insert per page within same tab session
    const key = `${pageName}`;
    if (sessionLogged.has(key)) return;
    sessionLogged.add(key);

    const visitorId = getVisitorId();
    const deviceType = detectDeviceType();

    const { error } = await supabase.from("portfolio_visits").insert({
      page_name: pageName,
      device_type: deviceType,
      visitor_id: visitorId,
    });

    if (error) {
      // Don't break the UI on analytics failure
      console.warn("logVisit insert failed:", error.message);
      sessionLogged.delete(key); // allow retry
    }
  } catch (e) {
    console.warn("logVisit error:", e);
  }
}

/**
 * Delete all visits made from this browser (by visitor_id).
 * Call after a successful admin login to remove the admin's own pre-login entries.
 */
export async function cleanupAdminVisits(): Promise<void> {
  try {
    const visitorId =
      typeof localStorage !== "undefined" ? localStorage.getItem(VISITOR_KEY) : null;
    if (!visitorId) return;
    const { error } = await supabase
      .from("portfolio_visits")
      .delete()
      .eq("visitor_id", visitorId);
    if (error) console.warn("cleanupAdminVisits failed:", error.message);
  } catch (e) {
    console.warn("cleanupAdminVisits error:", e);
  }
}

export interface VisitRow {
  id: number;
  visited_at: string;
  page_name: string;
  device_type: string;
  visitor_id: string | null;
}

/** Fetch recent visits for the admin panel */
export async function fetchVisits(limit = 200): Promise<VisitRow[]> {
  const { data, error } = await supabase
    .from("portfolio_visits")
    .select("id, visited_at, page_name, device_type, visitor_id")
    .order("visited_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("fetchVisits failed:", error.message);
    return [];
  }
  return (data || []) as VisitRow[];
}

/** Delete all visit logs (admin only) */
export async function clearAllVisits(): Promise<boolean> {
  const { error } = await supabase
    .from("portfolio_visits")
    .delete()
    .neq("id", 0); // delete-all guard
  if (error) {
    console.warn("clearAllVisits failed:", error.message);
    return false;
  }
  return true;
}