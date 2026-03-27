-- Add status columns to track in-flight operations
-- Allows detection and recovery of partial records after server restarts

ALTER TABLE mock_interviews
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned'));

ALTER TABLE quiz_sessions
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned'));

-- Indexes for startup cleanup queries
CREATE INDEX IF NOT EXISTS idx_mock_interviews_status ON mock_interviews(status);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);
