-- Enforce unique display names (case-insensitive) to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_unique_ci
  ON public.profiles (lower(display_name))
  WHERE display_name IS NOT NULL;