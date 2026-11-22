-- Bahá'í vs non-Bahá'í visitor, shown on profiles and filterable on Browse.
-- Nullable: members who joined before this have no value until they edit
-- their profile. Covered by the existing profiles RLS policies (no new
-- policy needed: it is a column on a row members can already read).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS faith text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_faith_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_faith_check CHECK (faith IN ('bahai', 'non_bahai'));
  END IF;
END $$;
