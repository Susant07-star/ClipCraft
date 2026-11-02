"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  approveStory,
  copyToClipboard,
  fetchPackageById,
  generatePackage,
  pollJobStatus,
  reviseStory,
} from "@/lib/api";
import type { VideoPackage } from "@/lib/types";

interface DashboardProps {
  accessToken: string;
  isAnonymous: boolean;
  activePackageId: string | null;
  onSelectPackage: (id: string) => void;
  onOpenChat: () => void;
}

type Language = "Auto" | "English" | "Hindi" | "Nepali";

export default function Dashboard({ accessToken, isAnonymous, activePackageId, onSelectPackage, onOpenChat }: DashboardProps) {
  const [language, setLanguage] = useState<Language>("Auto");
  const [genre, setGenre] = useState<string>("Funny");
  const [videoStyle, setVideoStyle] = useState<string>("Hyper-Realistic");
  const [jobStatus, setJobStatus] = useState<string>("idle"); // idle | queued | running | completed | failed
  const [loadedPackage, setPackage] = useState<VideoPackage | null>(null);
  const [activeTab, setActiveTab] = useState("research");
  const [copied, setCopied] = useState<string | null>(null);
  const [storyDraft, setStoryDraft] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [workflowError, setWorkflowError] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const package_ = loadedPackage?.id === activePackageId ? loadedPackage : null;

  // Load the selected, owner-scoped project.
  useEffect(() => {
    if (!activePackageId) return;
    let active = true;
    fetchPackageById(accessToken, activePackageId)
      .then((loaded) => {
        if (!active) return;
        setPackage(loaded);
        setStoryDraft(loaded.story || "");
        setJobStatus(loaded.status || "idle");
        setActiveTab(loaded.story_approved ? "characters" : "story");
      })
      .catch((error) => {
        if (active) setWorkflowError(error instanceof Error ? error.message : "Could not load this project.");
      });
    return () => { active = false; };
  }, [activePackageId, accessToken]);

  // Poll job status
  const startPolling = useCallback((jid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const status = await pollJobStatus(accessToken, jid);
        setJobStatus(status.status);
        if (status.result) {
          setPackage(status.result);
          setStoryDraft(status.result.story || "");
          setChangeRequest("");
          onSelectPackage(status.result.id);
          if (["awaiting_approval", "needs_creator_review"].includes(status.status)) {
            setActiveTab("story");
          }
        }
        if (["awaiting_approval", "needs_creator_review", "completed", "failed"].includes(status.status)) {
          clearInterval(pollingRef.current!);
          if (status.error) setWorkflowError(status.error);
        }
      } catch (error) {
        clearInterval(pollingRef.current!);
        setWorkflowError(error instanceof Error ? error.message : "Could not check workflow status.");
      }
    }, 3000);
  }, [accessToken, onSelectPackage]);

  useEffect(() => {
    if (
      package_?.id
      && ["generating_story", "reviewing_story", "generating_assets"].includes(package_.status)
    ) {
      startPolling(package_.id);
    }
  }, [package_?.id, package_?.status, startPolling]);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const handleGenerate = async () => {
    try {
      setWorkflowError("");
      setJobStatus("queued");
      setPackage(null);
      const { job_id } = await generatePackage(accessToken, language, videoStyle, genre);
      startPolling(job_id);
    } catch (error) {
      setJobStatus("failed");
      setWorkflowError(error instanceof Error ? error.message : "Could not start story generation.");
    }
  };

  const handleApproveStory = async () => {
    if (!package_?.id) return;
    try {
      setWorkflowError("");
      const result = await approveStory(accessToken, package_.id);
      setJobStatus("generating_assets");
      setPackage((current) => current ? { ...current, status: "generating_assets", story_approved: true } : current);
      setActiveTab("characters");
      startPolling(result.job_id);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "Could not approve this story.");
    }
  };

  const handleSubmitStory = async () => {
    if (!package_?.id) return;
    try {
      setWorkflowError("");
      const result = await reviseStory(accessToken, package_.id, storyDraft, changeRequest);
      setJobStatus("reviewing_story");
      setPackage((current) => current ? {
        ...current,
        story: storyDraft,
        status: "reviewing_story",
        story_approved: false,
        characters: [],
        video_clips: [],
        thumbnail_prompt: "",
        seo_metadata: {},
        current_story_version: result.story_version,
      } : current);
      setChangeRequest("");
      startPolling(result.job_id);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "Could not submit story changes.");
    }
  };

  const handleCopy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const allTabs = ["research", "story", "characters", "clips", "thumbnail", "seo"];
  const tabs = package_?.story_approved ? allTabs : ["research", "story"];

  const isGenerating = ["queued", "running", "generating_story", "reviewing_story", "generating_assets"].includes(jobStatus);
  const canApproveStory = package_?.status !== undefined
    && ["awaiting_approval", "needs_creator_review"].includes(package_.status);
  const canReviseStory = package_?.story && !isGenerating;

  return (
    <div className="min-h-full">
      {/* Top Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-[#2a2a3d] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8" style={{ background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)" }}>
        <div>
          <h1 className="text-xl font-bold gradient-text">ClipCraft Studio</h1>
          <p className="mt-0.5 text-xs" style={{ color: "#6b7280" }}>Create and review short-form stories before production</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span>{isAnonymous ? "Guest session · saved in this browser" : "Private session"}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center md:justify-end">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            disabled={isGenerating}
            className="min-h-11 min-w-0 rounded-lg border border-[#2a2a3d] px-3 py-2 text-sm font-medium focus:border-[#7c3aed] focus:outline-none"
            style={{ background: "#12121a", color: "white" }}
          >
            <option value="Auto">🌍 Auto (Best Market)</option>
            <option value="English">🇬🇧 English</option>
            <option value="Hindi">🇮🇳 Hindi</option>
            <option value="Nepali">🇳🇵 Nepali</option>
          </select>

          {/* Genre selector */}
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={isGenerating}
            className="min-h-11 min-w-0 rounded-lg border border-[#2a2a3d] px-3 py-2 text-sm font-medium focus:border-[#7c3aed] focus:outline-none"
            style={{ background: "#12121a", color: "white" }}
          >
            <option value="Funny">😂 Funny</option>
            <option value="Horror">👻 Horror</option>
            <option value="Sci-Fi">👽 Sci-Fi</option>
            <option value="Mystery">🕵️ Mystery</option>
            <option value="Sad">😢 Sad</option>
            <option value="Opposite World Funny">🙃 Opposite World Funny</option>
            <option value="Cute Kid Funny">👶 Cute Kid Funny</option>
            <option value="Fruits & Veggies Funny">🍎 Fruits & Veggies Funny</option>
            <option value="Fruits & Veggies Emotion">🍅 Fruits & Veggies Emotional</option>
          </select>

          {/* Style selector */}
          <select
            value={videoStyle}
            onChange={(e) => setVideoStyle(e.target.value)}
            disabled={isGenerating}
            className="min-h-11 min-w-0 rounded-lg border border-[#2a2a3d] px-3 py-2 text-sm font-medium focus:border-[#7c3aed] focus:outline-none"
            style={{ background: "#12121a", color: "white" }}
          >
            <option value="Hyper-Realistic">🎥 Hyper-Realistic</option>
            <option value="3D Pixar Animation">🧸 3D Pixar Animation</option>
            <option value="Anime / Studio Ghibli">🌸 Anime / Ghibli</option>
            <option value="Dark Cinematic">🌑 Dark Cinematic</option>
          </select>

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary col-span-2 flex min-h-11 items-center justify-center gap-2 text-sm sm:col-span-1">
            {isGenerating ? (
              <>
                <span className="pulse-dot w-2 h-2 rounded-full bg-white inline-block" />
                {jobStatus === "queued" ? "Queued..." : "Generating..."}
              </>
            ) : (
              <><span>✦</span> New story</>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {workflowError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <span>{workflowError}</span>
            <button type="button" onClick={() => setWorkflowError("")} className="min-h-11 rounded-lg px-3 text-white hover:bg-red-500/20">Dismiss</button>
          </div>
        )}
        {/* Empty state */}
        {!package_ && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold gradient-text mb-2">Ready to Create</h2>
            <p className="max-w-md text-sm leading-relaxed" style={{ color: "#6b7280" }}>
              Choose a style and start a story. Review and approve it before ClipCraft generates production prompts.
            </p>
          </div>
        )}

        {/* Generating state (Progress Tracker) */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center p-8 mb-8 card text-center" style={{ border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="text-4xl mb-4 animate-bounce">🤖</div>
            <h2 className="mb-3 text-xl font-bold">
              {jobStatus === "generating_assets" ? "Building your approved production kit…" : "Preparing your story for review…"}
            </h2>
            <div className="space-y-3 text-sm max-w-sm mx-auto" style={{ color: "#6b7280" }}>
              {[
                { id: "researcher", label: "Researching trending topics" },
                { id: "story_writer", label: "Writing your story" },
                { id: "reviewer", label: "Reviewing & refining" },
              ].map((step, i) => {
                const isCompleted = package_?.completed_steps?.includes(step.id);
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    {isCompleted ? (
                      <span className="text-green-500 font-bold text-lg">✓</span>
                    ) : (
                      <span className="pulse-dot w-2 h-2 rounded-full bg-purple-500 inline-block flex-shrink-0 mx-[5px]" style={{ animationDelay: `${i * 0.2}s` }} />
                    )}
                    <span className={isCompleted ? "text-white font-medium" : ""}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-xs" style={{ color: "#8b8b9b" }}>
              {jobStatus === "generating_assets"
                ? "Production prompts are generated only from your approved story."
                : "This stage stops for your decision before production prompts are created."}
            </p>
          </div>
        )}

        {/* Package result */}
        {package_ && (package_.topic || package_.story) && (
          <div className="fade-in space-y-6">
            {/* Package header */}
            <div className="card p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold">{package_.topic}</h2>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="tag">{package_.language}</span>
                    <span className="tag">{package_.video_clips?.length || 0} clips</span>
                    {package_.virality_score > 0 && (
                      <span className={`badge ${package_.virality_score >= 8 ? "badge-green" : package_.virality_score >= 6 ? "badge-yellow" : "badge-red"}`}>
                        Editorial score: {package_.virality_score}/10
                      </span>
                    )}
                    <span className="tag">{package_.status?.replaceAll("_", " ") || "draft"}</span>
                  </div>
                </div>
                {package_.story_approved && (
                  <button onClick={onOpenChat} className="btn-primary flex min-h-11 items-center gap-2 text-sm">
                    Fix an external-tool prompt
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-gray-400">
                Editorial scores are review heuristics, not predictions of reach or performance.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-[#2a2a3d] p-1" style={{ background: "#12121a" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-all capitalize ${
                    activeTab === tab
                      ? "text-white"
                      : "hover:text-white"
                  }`}
                  style={{
                    background: activeTab === tab ? "linear-gradient(135deg, #7c3aed, #9333ea)" : "transparent",
                    color: activeTab === tab ? "white" : "#6b7280",
                  }}
                >
                  {tab === "seo" ? "SEO" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Research tab */}
            {activeTab === "research" && (
              <div className="space-y-4">
                <div className="card p-6 space-y-4">
                  <h3 className="font-semibold text-base">📊 Market Trend Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg" style={{ background: "#0a0a0f" }}>
                      <div className="text-xs mb-1" style={{ color: "#6b7280" }}>Winning Topic</div>
                      <div className="text-sm font-semibold gradient-text">{package_.topic}</div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: "#0a0a0f" }}>
                      <div className="text-xs mb-1" style={{ color: "#6b7280" }}>Trend Score (Last 7 Days)</div>
                      <div className="text-sm font-semibold">{package_.trend_scores?.[package_.topic] || "N/A"}/100</div>
                    </div>
                  </div>
                </div>
                
                <h3 className="font-semibold text-base mt-6">🔥 Top Trending YouTube Videos Found</h3>
                <div className="grid gap-3">
                  {(package_.trending_videos || []).map((video, i) => (
                    <a 
                      key={i} 
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card p-4 hover:border-[#9333ea] transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm line-clamp-1">{video.title}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#6b7280" }}>
                          <span>📺 {video.channel}</span>
                          <span>👁️ {video.view_count?.toLocaleString()} views</span>
                        </div>
                      </div>
                      <div className="text-xs bg-[#9333ea] text-white px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0">
                        Play ▶️
                      </div>
                    </a>
                  ))}
                  {(!package_.trending_videos || package_.trending_videos.length === 0) && (
                    <div className="text-sm p-4 rounded-lg text-center" style={{ background: "#0a0a0f", color: "#6b7280" }}>
                      No recent videos found for this topic.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Story tab */}
            {activeTab === "story" && (
              <section className="card space-y-5 p-4 md:p-6" aria-labelledby="story-workshop-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 id="story-workshop-title" className="text-base font-semibold">Story workshop</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Version {package_.current_story_version || 1} · {package_.story_versions?.length || 1} saved version(s) · {package_.review_pass_count || 0}/3 AI review passes
                    </p>
                  </div>
                  <button onClick={() => handleCopy(package_.story || "", "story")} className="min-h-11 rounded-lg border border-[#2a2a3d] px-4 text-sm text-gray-200 hover:border-purple-400">
                    {copied === "story" ? "Copied" : "Copy story"}
                  </button>
                </div>
                <div aria-live="polite" className="rounded-xl border border-[#2a2a3d] bg-[#0a0a0f] p-4">
                  <p className="text-sm font-medium text-white">
                    {canApproveStory
                      ? "Your decision is needed before production."
                      : package_.story_approved
                        ? `Approved for production from version ${package_.approved_story_version || package_.current_story_version}.`
                        : package_.status?.replaceAll("_", " ") || "Draft"}
                  </p>
                  {package_.workflow_state?.reviewer_feedback && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-200">
                      AI review feedback: {package_.workflow_state.reviewer_feedback}
                    </p>
                  )}
                  {package_.status === "needs_creator_review" && (
                    <p className="mt-2 text-sm text-amber-200">
                      The three-pass review limit was reached. Review the feedback, edit the script, or approve it yourself.
                    </p>
                  )}
                </div>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Story script</span>
                  <textarea
                    value={storyDraft}
                    onChange={(event) => setStoryDraft(event.target.value)}
                    disabled={!canReviseStory}
                    rows={12}
                    className="min-h-64 w-full resize-y rounded-xl border border-[#2a2a3d] bg-[#0a0a0f] p-4 text-sm leading-relaxed text-gray-100 focus:border-purple-500 focus:outline-none disabled:opacity-70"
                    aria-label="Edit story script"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Optional AI change request</span>
                  <textarea
                    value={changeRequest}
                    onChange={(event) => setChangeRequest(event.target.value)}
                    disabled={!canReviseStory}
                    rows={3}
                    placeholder="For example: shorten the setup and make the ending more hopeful."
                    className="w-full resize-y rounded-xl border border-[#2a2a3d] bg-[#0a0a0f] p-4 text-sm text-gray-100 focus:border-purple-500 focus:outline-none disabled:opacity-70"
                  />
                </label>
                <p className="text-xs leading-relaxed text-gray-400">
                  Submitting changes creates a new story version, clears assets from the prior version, and starts a fresh three-pass review cycle.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {canReviseStory && (
                    <button
                      type="button"
                      onClick={handleSubmitStory}
                      disabled={!storyDraft.trim() || (!changeRequest.trim() && storyDraft.trim() === package_.story?.trim())}
                      className="min-h-11 rounded-xl border border-purple-400/50 px-5 py-3 text-sm font-semibold text-purple-200 hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {changeRequest.trim() ? "Request AI revision" : "Submit edited story for review"}
                    </button>
                  )}
                  {canApproveStory && (
                    <button type="button" onClick={handleApproveStory} className="btn-primary min-h-11 px-5 py-3 text-sm">
                      Approve story and generate prompts
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Characters tab */}
            {activeTab === "characters" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">🎭 Character Reference Prompts</h3>
                {(package_.characters || []).map((char, i) => (
                  <div key={i} className="card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{char.name}</div>
                        <div className="flex gap-2 mt-1">
                          <span className="tag">{char.role}</span>
                          <span className="tag">🎤 {char.voice_style}</span>
                        </div>
                      </div>
                      <button onClick={() => handleCopy(char.reference_prompt, `char-${i}`)} className="copy-btn">
                        {copied === `char-${i}` ? "✓ Copied!" : "Copy Prompt"}
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed p-4 rounded-lg" style={{ background: "#0a0a0f", color: "#a78bfa", fontFamily: "monospace", fontSize: "13px" }}>
                      {char.reference_prompt}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Clips tab */}
            {activeTab === "clips" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-base">🎬 Video prompts for external tools</h3>
                  <p className="mt-1 text-sm text-gray-400">These are text prompts, not rendered video.</p>
                </div>
                {(package_.video_clips || []).map((clip, i) => (
                  <div key={i} className="clip-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "rgba(124,58,237,0.2)", color: "#a855f7" }}>
                          {clip.clip_number}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Clip {clip.clip_number} · {clip.time_range}</div>
                          {clip.characters_to_attach && clip.characters_to_attach.length > 0 && (
                            <div className="text-xs mt-0.5" style={{ color: "#f59e0b" }}>
                              📎 Attach: {clip.characters_to_attach.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(
                          `[VISUAL]: ${clip.visual}\n\n[CHARACTER VOICE]: ${clip.character_voice}\n\n[BACKGROUND MUSIC]: ${clip.background_music}\n\n[SOUND EFFECTS]: ${clip.sound_effects}`,
                          `clip-${i}`
                        )}
                        className="copy-btn"
                      >
                        {copied === `clip-${i}` ? "✓ Copied!" : "Copy Prompt"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {[
                        { label: "🎥 VISUAL", value: clip.visual, color: "#818cf8" },
                        { label: "🎤 CHARACTER VOICE", value: clip.character_voice, color: "#34d399" },
                        { label: "🎵 BACKGROUND MUSIC", value: clip.background_music, color: "#f472b6" },
                        { label: "🔊 SOUND EFFECTS", value: clip.sound_effects, color: "#fbbf24" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <div className="font-semibold mb-1" style={{ color, fontSize: "10px", letterSpacing: "0.05em" }}>{label}</div>
                          <div style={{ color: "#e5e7eb" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Thumbnail tab */}
            {activeTab === "thumbnail" && (
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">🖼️ Thumbnail Prompt · 9:16</h3>
                  <button onClick={() => handleCopy(package_.thumbnail_prompt, "thumb")} className="copy-btn">
                    {copied === "thumb" ? "✓ Copied!" : "Copy Prompt"}
                  </button>
                </div>
                <div className="p-5 rounded-xl text-sm leading-relaxed" style={{ background: "#0a0a0f", color: "#a78bfa", fontFamily: "monospace", border: "1px solid rgba(124,58,237,0.2)" }}>
                  {package_.thumbnail_prompt}
                </div>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  💡 Use this prompt with your chosen image-generation tool. Set aspect ratio to <strong>9:16</strong> for vertical short-form content.
                </p>
              </div>
            )}

            {/* SEO tab */}
            {activeTab === "seo" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">📈 Platform SEO Metadata</h3>
                {[
                  { platform: "YouTube Shorts", icon: "▶️", key: "youtube" },
                  { platform: "TikTok", icon: "🎵", key: "tiktok" },
                  { platform: "Instagram Reels", icon: "📸", key: "instagram" },
                  { platform: "Facebook Reels", icon: "👥", key: "facebook" },
                ].map(({ platform, icon, key }) => {
                  const data = package_.seo_metadata?.[key];
                  if (!data) return null;
                  return (
                    <div key={key} className="card p-5 space-y-3">
                      <div className="font-semibold text-sm">{icon} {platform}</div>
                      {data.title && (
                        <div>
                          <div className="text-xs mb-1" style={{ color: "#6b7280" }}>Title</div>
                          <div className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: "#0a0a0f" }}>
                            <span className="text-sm">{data.title}</span>
                            <button onClick={() => handleCopy(data.title || "", `${key}-title`)} className="copy-btn flex-shrink-0">
                              {copied === `${key}-title` ? "✓" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}
                      {(data.description || data.caption) && (
                        <div>
                          <div className="text-xs mb-1" style={{ color: "#6b7280" }}>Description / Caption</div>
                          <div className="flex items-start justify-between gap-3 p-3 rounded-lg" style={{ background: "#0a0a0f" }}>
                            <span className="text-sm flex-1">{data.description || data.caption}</span>
                            <button onClick={() => handleCopy(data.description || data.caption || "", `${key}-desc`)} className="copy-btn flex-shrink-0 mt-0.5">
                              {copied === `${key}-desc` ? "✓" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}
                      {(data.tags || data.hashtags) && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs" style={{ color: "#6b7280" }}>Tags / Hashtags</div>
                            <button 
                              onClick={() => {
                                const tags = data.tags || data.hashtags || [];
                                const allTags = tags.map((tag) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
                                handleCopy(allTags, `${key}-tags-all`);
                              }} 
                              className="copy-btn text-[10px] px-2 py-0.5"
                            >
                              {copied === `${key}-tags-all` ? "✓ Copied!" : "Copy All"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(data.tags || data.hashtags || []).map((t, i) => (
                              <span key={i} className="tag cursor-pointer" onClick={() => handleCopy(t.startsWith('#') ? t : `#${t}`, `tag-${key}-${i}`)}>#{t.replace(/^#/, "")}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
