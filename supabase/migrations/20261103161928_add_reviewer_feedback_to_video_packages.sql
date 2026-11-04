ALTER TABLE video_packages
    ADD COLUMN IF NOT EXISTS reviewer_feedback TEXT;
