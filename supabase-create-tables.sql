-- =============================================================
-- Create Tables — Run this BEFORE supabase-rls-setup.sql
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL DEFAULT '',
  short_description TEXT DEFAULT '',
  full_description TEXT DEFAULT '',
  role TEXT DEFAULT '',
  timeline TEXT DEFAULT '',
  images JSONB DEFAULT '[]'::jsonb,
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Profile table (single row, id = 1)
CREATE TABLE IF NOT EXISTS public.profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT '',
  title TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  vision TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  skills JSONB DEFAULT '[]'::jsonb,
  email TEXT DEFAULT '',
  mobile TEXT DEFAULT ''
);

-- Insert default profile row
INSERT INTO public.profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING;