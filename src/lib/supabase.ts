import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Inject preconnect link at runtime for faster subsequent fetches
if (supabaseUrl && typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = supabaseUrl;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}
