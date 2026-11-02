CREATE TABLE IF NOT EXISTS video_packages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'completed',
    current_story_version INT NOT NULL DEFAULT 0,
    approved_story_version INT,
    ai_review_approved BOOLEAN NOT NULL DEFAULT false,
    story_approved BOOLEAN NOT NULL DEFAULT false,
    review_pass_count INT NOT NULL DEFAULT 0,
    story_versions JSONB NOT NULL DEFAULT '[]',
    workflow_state JSONB NOT NULL DEFAULT '{}',
    generation_error TEXT,
    language    TEXT NOT NULL DEFAULT 'English',
    topic       TEXT,
    virality_score INT DEFAULT 0,
    trending_videos JSONB DEFAULT '[]',
    trend_scores JSONB DEFAULT '{}',
    research_brief JSONB DEFAULT '{}',
    research_trace JSONB DEFAULT '[]',
    research_errors JSONB DEFAULT '[]',
    story       TEXT,
    characters  JSONB DEFAULT '[]',
    video_clips JSONB DEFAULT '[]',
    thumbnail_prompt TEXT,
    seo_metadata JSONB DEFAULT '{}'
);

ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS trending_videos JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS trend_scores JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS research_brief JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS research_trace JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS research_errors JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS current_story_version INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS approved_story_version INT,
    ADD COLUMN IF NOT EXISTS ai_review_approved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS story_approved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS review_pass_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS story_versions JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS workflow_state JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS generation_error TEXT;

CREATE INDEX IF NOT EXISTS idx_video_packages_user_created_at
    ON video_packages(user_id, created_at DESC);

ALTER TABLE video_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_packages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON video_packages;
DROP POLICY IF EXISTS "Users can read their packages" ON video_packages;
DROP POLICY IF EXISTS "Users can create their packages" ON video_packages;
DROP POLICY IF EXISTS "Users can update their packages" ON video_packages;
DROP POLICY IF EXISTS "Users can delete their packages" ON video_packages;

REVOKE ALL ON TABLE video_packages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE video_packages TO authenticated;

CREATE POLICY "Users can read their packages"
    ON video_packages FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their packages"
    ON video_packages FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their packages"
    ON video_packages FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their packages"
    ON video_packages FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);