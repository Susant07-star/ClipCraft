-- ============================================================
-- SUPABASE DATABASE SCHEMA
-- ClipCraft Studio - AI Video Prompt Studio
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to set up the database.
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================

CREATE TABLE IF NOT EXISTS video_packages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Generation metadata
    language    TEXT NOT NULL DEFAULT 'English',
    topic       TEXT,
    virality_score INT DEFAULT 0,
    trending_videos JSONB DEFAULT '[]', -- Recent videos used for trend research
    trend_scores JSONB DEFAULT '{}',    -- Google Trends scores by keyword
    research_brief JSONB DEFAULT '{}',  -- Evidence and LLM analysis used for the idea
    research_trace JSONB DEFAULT '[]',  -- Successful researcher stage events
    research_errors JSONB DEFAULT '[]', -- Caught researcher failures

    -- Content
    story       TEXT,
    characters  JSONB DEFAULT '[]',   -- Array of character objects
    video_clips JSONB DEFAULT '[]',   -- Array of 10-second clip prompt objects
    thumbnail_prompt TEXT,
    seo_metadata JSONB DEFAULT '{}'   -- Platform-specific SEO object
);

-- Migration for databases created before trend research data was persisted.
ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS trending_videos JSONB DEFAULT '[]';

ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS trend_scores JSONB DEFAULT '{}';

ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS research_brief JSONB DEFAULT '{}';

ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS research_trace JSONB DEFAULT '[]';

ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS research_errors JSONB DEFAULT '[]';

-- Index for fast ordering by date (sidebar history list)
CREATE INDEX IF NOT EXISTS idx_video_packages_created_at ON video_packages(created_at DESC);

-- Enable Row Level Security (optional — useful if you add auth later)
ALTER TABLE video_packages ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (open access — add auth policy later if needed)
DROP POLICY IF EXISTS "Allow all" ON video_packages;
CREATE POLICY "Allow all" ON video_packages FOR ALL USING (true) WITH CHECK (true);
