-- Migration: Tambah kolom avatar_url di tabel users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
