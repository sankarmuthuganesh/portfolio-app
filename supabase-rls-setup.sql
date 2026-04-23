-- =============================================================
-- Supabase RLS & Auth Setup — Complete Fix
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- =============================================================
-- STEP 1: Grant table-level permissions to Supabase roles
-- (This is the missing piece — RLS only works AFTER GRANT)
-- =============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile TO authenticated;

-- If tables use sequences for IDs:
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================
-- STEP 2: Enable RLS
-- =============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- STEP 3: Drop ALL existing policies (clean slate)
-- =============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname); END LOOP;

  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.profile', pol.policyname); END LOOP;
END$$;

DROP POLICY IF EXISTS "Public read storage images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert storage images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update storage images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete storage images" ON storage.objects;

-- =============================================================
-- STEP 4: Create RLS policies
-- =============================================================

-- PROJECTS
CREATE POLICY "projects_select_all" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "projects_insert_auth" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update_auth" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "projects_delete_auth" ON public.projects FOR DELETE TO authenticated USING (true);

-- PROFILE
CREATE POLICY "profile_select_all" ON public.profile FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profile_insert_auth" ON public.profile FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profile_update_auth" ON public.profile FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- STORAGE
CREATE POLICY "Public read storage images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Auth insert storage images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');
CREATE POLICY "Auth update storage images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'images');
CREATE POLICY "Auth delete storage images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images');

-- =============================================================
-- STEP 5: Verify
-- =============================================================
SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;