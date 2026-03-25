-- InterviewAce Database Schema
-- Run this in your Supabase SQL Editor

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    jd_text TEXT NOT NULL,
    resume_text TEXT NOT NULL DEFAULT '',
    round_description TEXT NOT NULL,
    resume_file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Prep Sources table
CREATE TABLE IF NOT EXISTS prep_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Quiz Sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('text', 'voice', 'mcq')),
    questions JSONB NOT NULL DEFAULT '[]',
    answers JSONB NOT NULL DEFAULT '[]',
    feedback JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Mock Interviews table
CREATE TABLE IF NOT EXISTS mock_interviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    topics TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'senior', 'staff')),
    transcript JSONB NOT NULL DEFAULT '[]',
    recording_url TEXT,
    feedback_report JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_prep_sources_session_id ON prep_sources(session_id);
CREATE INDEX idx_quiz_sessions_session_id ON quiz_sessions(session_id);
CREATE INDEX idx_mock_interviews_session_id ON mock_interviews(session_id);

-- Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Prep sources: access via session ownership
CREATE POLICY "Users can view own prep sources"
    ON prep_sources FOR SELECT
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can create prep sources for own sessions"
    ON prep_sources FOR INSERT
    WITH CHECK (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own prep sources"
    ON prep_sources FOR DELETE
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

-- Quiz sessions: access via session ownership
CREATE POLICY "Users can view own quiz sessions"
    ON quiz_sessions FOR SELECT
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can create quiz sessions for own sessions"
    ON quiz_sessions FOR INSERT
    WITH CHECK (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own quiz sessions"
    ON quiz_sessions FOR UPDATE
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own quiz sessions"
    ON quiz_sessions FOR DELETE
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

-- Mock interviews: access via session ownership
CREATE POLICY "Users can view own mock interviews"
    ON mock_interviews FOR SELECT
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can create mock interviews for own sessions"
    ON mock_interviews FOR INSERT
    WITH CHECK (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own mock interviews"
    ON mock_interviews FOR UPDATE
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own mock interviews"
    ON mock_interviews FOR DELETE
    USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

-- Updated_at trigger for sessions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Service role bypass for backend API
-- The backend uses the service_role key which bypasses RLS
-- This is intentional: the backend validates user ownership in application code
