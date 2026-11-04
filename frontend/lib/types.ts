export interface TrendingVideo {
  video_id?: string;
  title?: string;
  channel?: string;
  view_count?: number;
}

export interface CharacterPrompt {
  name: string;
  role?: string;
  voice_style?: string;
  reference_prompt: string;
}

export interface VideoClip {
  clip_number: number;
  time_range?: string;
  visual: string;
  character_voice: string;
  background_music: string;
  sound_effects: string;
  characters_to_attach?: string[];
}

export interface PlatformMetadata {
  title?: string;
  description?: string;
  caption?: string;
  tags?: string[];
  hashtags?: string[];
}

export interface StoryVersion {
  version: number;
  story: string;
  status: string;
  review_pass_count: number;
  revision_count: number;
  virality_score: number;
  reviewer_feedback?: string | null;
  submitted_at: string;
  approved_at?: string;
}

export interface VideoPackage {
  id: string;
  user_id?: string;
  status: string;
  language: string;
  topic: string;
  target_duration: number;
  selected_platforms: string[];
  story: string;
  virality_score: number;
  review_pass_count: number;
  current_story_version: number;
  approved_story_version?: number | null;
  ai_review_approved: boolean;
  story_approved: boolean;
  reviewer_feedback?: string | null;
  story_versions: StoryVersion[];
  workflow_state: {
    reviewer_feedback?: string | null;
    completed_steps?: string[];
    [key: string]: unknown;
  };
  trending_videos: TrendingVideo[];
  trend_scores: Record<string, number | string>;
  research_brief: Record<string, unknown>;
  research_trace: Array<Record<string, unknown>>;
  research_errors: Array<Record<string, unknown>>;
  characters: CharacterPrompt[];
  video_clips: VideoClip[];
  thumbnail_prompt: string;
  seo_metadata: Record<string, PlatformMetadata | undefined>;
  generation_error?: string | null;
}

export interface WorkflowJob {
  status: string;
  result?: VideoPackage | null;
  error?: string | null;
  logs?: Array<{ timestamp: string; level: string; message: string }>;
}

export interface FixedClipResult {
  fixed_clip: VideoClip;
}
