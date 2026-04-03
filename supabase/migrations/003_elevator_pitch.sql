-- Elevator Pitch Feature
-- Requires: 001_initial_schema.sql (for update_updated_at_column trigger)
-- Requires: pitch-recordings Supabase Storage bucket (set to public)

-- Elevator Pitches table — stores the generated/edited pitch text
CREATE TABLE IF NOT EXISTS elevator_pitches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pitch_text TEXT NOT NULL DEFAULT '',
    target_role TEXT NOT NULL DEFAULT '',
    company_name TEXT NOT NULL DEFAULT '',
    resume_text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Pitch Recordings table — stores each 60-second practice attempt
CREATE TABLE IF NOT EXISTS pitch_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pitch_id UUID NOT NULL REFERENCES elevator_pitches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT,                             -- Supabase Storage public URL (null if not uploaded)
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    transcript TEXT NOT NULL DEFAULT '',
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback JSONB,                             -- structured AI feedback
    share_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::TEXT, '-', ''),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_elevator_pitches_user_id ON elevator_pitches(user_id);
CREATE INDEX idx_pitch_recordings_pitch_id ON pitch_recordings(pitch_id);
CREATE INDEX idx_pitch_recordings_user_id ON pitch_recordings(user_id);
CREATE INDEX idx_pitch_recordings_share_token ON pitch_recordings(share_token);

-- Row Level Security
ALTER TABLE elevator_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_recordings ENABLE ROW LEVEL SECURITY;

-- Elevator pitches: user owns their own pitches
CREATE POLICY "Users can view own pitches"
    ON elevator_pitches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pitches"
    ON elevator_pitches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pitches"
    ON elevator_pitches FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pitches"
    ON elevator_pitches FOR DELETE
    USING (auth.uid() = user_id);

-- Pitch recordings: user owns their own recordings
CREATE POLICY "Users can view own recordings"
    ON pitch_recordings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recordings"
    ON pitch_recordings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings"
    ON pitch_recordings FOR DELETE
    USING (auth.uid() = user_id);

-- Ensure the updated_at trigger function exists (defined in 001, re-declared here for safety)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at trigger for elevator_pitches
CREATE TRIGGER update_elevator_pitches_updated_at
    BEFORE UPDATE ON elevator_pitches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Public share links are served by the backend using the service_role key.
-- The backend validates the share_token in application code — no special anon RLS needed.

-- NOTE: To enable video storage, create a public Supabase Storage bucket named "pitch-recordings":
--   Dashboard → Storage → New Bucket → Name: "pitch-recordings" → Public: ON
