CREATE TABLE IF NOT EXISTS shared_postcards (
  slug text PRIMARY KEY CHECK (char_length(slug) <= 64),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Shares are read and written by the server, never through Supabase's public Data API.
ALTER TABLE shared_postcards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON shared_postcards FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON shared_postcards FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON shared_postcards FROM authenticated;
  END IF;
END $$;
