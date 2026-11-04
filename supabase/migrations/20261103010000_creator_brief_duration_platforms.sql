ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS target_duration INT NOT NULL DEFAULT 60 CHECK (target_duration BETWEEN 30 AND 90),
    ADD COLUMN IF NOT EXISTS selected_platforms JSONB NOT NULL DEFAULT '["youtube", "tiktok", "instagram", "facebook"]';
