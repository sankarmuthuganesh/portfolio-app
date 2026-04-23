-- =============================================================
-- Portfolio Visits Audit — Setup
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- Visits audit table (simple)
CREATE TABLE IF NOT EXISTS public.portfolio_visits (
  id           bigserial PRIMARY KEY,
  visited_at   timestamptz NOT NULL DEFAULT now(),
  page_name    text NOT NULL,        -- 'Home' or project title (e.g. 'Weather App')
  device_type  text NOT NULL,        -- 'mobile' / 'tablet' / 'desktop'
  visitor_id   text                  -- stable anonymous UUID from localStorage
);

-- Helpful indexes for queries
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON public.portfolio_visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_page       ON public.portfolio_visits (page_name);
CREATE INDEX IF NOT EXISTS idx_visits_visitor    ON public.portfolio_visits (visitor_id);

-- Grants (required for RLS to work in Supabase)
GRANT SELECT, INSERT, DELETE ON public.portfolio_visits TO anon;
GRANT SELECT, INSERT, DELETE ON public.portfolio_visits TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.portfolio_visits_id_seq TO anon, authenticated;

-- Enable RLS
ALTER TABLE public.portfolio_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (clean slate)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'portfolio_visits'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.portfolio_visits', pol.policyname);
  END LOOP;
END$$;

-- Anyone (anon or authenticated) can INSERT a visit row
CREATE POLICY "visits_insert_public"
  ON public.portfolio_visits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users (admin) can SELECT visits
CREATE POLICY "visits_select_admin"
  ON public.portfolio_visits
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users (admin) can DELETE visits
-- Used to clean up the admin's own pre-login visits, or to clear logs
CREATE POLICY "visits_delete_admin"
  ON public.portfolio_visits
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'portfolio_visits'
ORDER BY cmd;