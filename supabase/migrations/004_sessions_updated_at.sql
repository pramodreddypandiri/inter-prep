-- Ensure sessions.updated_at exists (idempotent) and is auto-bumped on UPDATE.
-- Migration 001 already defines these, but some environments were provisioned
-- from an older schema version that lacked the column/trigger, so this
-- migration brings them up to date without disturbing existing data.

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Force PostgREST to reload its schema cache so the new column is visible.
NOTIFY pgrst, 'reload schema';
