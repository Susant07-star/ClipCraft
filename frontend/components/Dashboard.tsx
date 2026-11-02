"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generatePackage, pollJobStatus, fetchPackageById, copyToClipboard } from "@/lib/api";

interface DashboardProps {
  activePackageId: string | null;
  onSelectPackage: (id: string) => void;
  onOpenChat: () => void;
}

type Language = "Auto" | "English" | "Hindi" | "Nepali";

export default function Dashboard({ activePackageId, onSelectPackage, onOpenChat }: DashboardProps) {
  const [language, setLanguage] = useState<Language>("Auto");
  const [genre, setGenre] = useState<string>("Funny");
  const [videoStyle, setVideoStyle] = useState<string>("Hyper-Realistic");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("idle"); // idle | queued | running | completed | failed
  const [package_, setPackage] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("research");
  const [copied, setCopied] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load selected package from sidebar or localStorage
  useEffect(() => {
    if (activePackageId && activePackageId !== package_?.id) {
      fetchPackageById(activePackageId).then(setPackage).catch(console.error);
    } else if (!activePackageId && !package_) {
      const saved = localStorage.getItem("latest_package");
      if (saved) {
        try {
          setPackage(JSON.parse(saved));
        } catch {}
      }
    }
  }, [activePackageId]);

  // Save to localStorage when package updates
  useEffect(() => {
    if (package_ && package_.id) {
      localStorage.setItem("latest_package", JSON.stringify(package_));
    }
  }, [package_]);

  // Poll job status
  const startPolling = useCallback((jid: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const status = await pollJobStatus(jid);
        setJobStatus(status.status);
        if (status.result) {
          setPackage(status.result);
        }
        if (status.status === "completed") {
          clearInterval(pollingRef.current!);
          onSelectPackage(status.result?.id || "");
        } else if (status.status === "failed") {
          clearInterval(pollingRef.current!);
        }
      } catch {
        clearInterval(pollingRef.current!);
      }
    }, 3000);
  }, []);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const handleGenerate = async () => {
    try {
      setJobStatus("queued");
      setPackage(null);
      const { job_id } = await generatePackage(language, videoStyle, genre);
      setJobId(job_id);
      startPolling(job_id);
    } catch {
      setJobStatus("failed");
    }
  };

  const handleCopy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const tabs = ["research", "story", "characters", "clips", "thumbnail", "seo"];

  const isGenerating = jobStatus === "queued" || jobStatus === "running";

  return (
    <div className="min-h-full">
      {/* Top Header */}
      <div className="sticky top-0 z-10 border-b border-[#2a2a3d] px-8 py-4 flex items-center justify-between" style={{ background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)" }}>
        <div>
          <h1 className="text-xl font-bold gradient-text">ClipCraft Studio</h1>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Create short-form stories, video prompts, and publishing kits</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            disabled={isGenerating}
            className="rounded-lg px-3 py-2 text-sm font-medium border border-[#2a2a3d] focus:outline-none focus:border-[#7c3aed]"
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
            className="rounded-lg px-3 py-2 text-sm font-medium border border-[#2a2a3d] focus:outline-none focus:border-[#7c3aed]"
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
            className="rounded-lg px-3 py-2 text-sm font-medium border border-[#2a2a3d] focus:outline-none focus:border-[#7c3aed]"
            style={{ background: "#12121a", color: "white" }}
          >
            <option value="Hyper-Realistic">🎥 Hyper-Realistic</option>
            <option value="3D Pixar Animation">🧸 3D Pixar Animation</option>
            <option value="Anime / Studio Ghibli">🌸 Anime / Ghibli</option>
            <option value="Dark Cinematic">🌑 Dark Cinematic</option>
          </select>

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary flex items-center gap-2 text-sm">
            {isGenerating ? (
              <>
                <span className="pulse-dot w-2 h-2 rounded-full bg-white inline-block" />
                {jobStatus === "queued" ? "Queued..." : "Generating..."}
              </>
            ) : (
              <><span>⚡</span> Generate Video Package</>
            )}
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Empty state */}
        {!package_ && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold gradient-text mb-2">Ready to Create</h2>
            <p className="max-w-md text-sm leading-relaxed" style={{ color: "#6b7280" }}>
              Select a language and click <strong>Generate Video Package</strong> to create a short-form story, video prompts, character references, and platform-ready metadata.
            </p>
          </div>
        )}

        {/* Generating state (Progress Tracker) */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center p-8 mb-8 card text-center" style={{ border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="text-4xl mb-4 animate-bounce">🤖</div>
            <h2 className="text-xl font-bold mb-3">AI Pipeline Running...</h2>
            <div className="space-y-3 text-sm max-w-sm mx-auto" style={{ color: "#6b7280" }}>
              {[
                { id: "researcher", label: "Researching trending topics" },
                { id: "story_writer", label: "Writing your story" },
                { id: "reviewer", label: "Reviewing & refining" },
                { id: "character_designer", label: "Designing characters" },
                { id: "prompt_engineer", label: "Building video prompts" },
                { id: "seo_specialist", label: "Generating SEO metadata" },
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
            {!package_?.topic && <p className="text-xs mt-6" style={{ color: "#4b5563" }}>Starting up engines... (takes ~10 seconds to begin)</p>}
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
                        Story review: {package_.virality_score}/10
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={onOpenChat} className="btn-primary text-sm flex items-center gap-2">
                  💬 Fix a Prompt
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#12121a", border: "1px solid #2a2a3d" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
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
                  {(package_.trending_videos || []).map((video: any, i: number) => (
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
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">📖 Story Script</h3>
                  <button onClick={() => handleCopy(package_.story, "story")} className="copy-btn">
                    {copied === "story" ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d1d5db", fontFamily: "inherit" }}>
                  {package_.story}
                </pre>
              </div>
            )}

            {/* Characters tab */}
            {activeTab === "characters" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">🎭 Character Reference Prompts</h3>
                {(package_.characters || []).map((char: any, i: number) => (
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
                <h3 className="font-semibold text-base">🎬 Video Generation Prompts</h3>
                {(package_.video_clips || []).map((clip: any, i: number) => (
                  <div key={i} className="clip-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "rgba(124,58,237,0.2)", color: "#a855f7" }}>
                          {clip.clip_number}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Clip {clip.clip_number} · {clip.time_range}</div>
                          {clip.characters_to_attach?.length > 0 && (
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
                            <button onClick={() => handleCopy(data.title, `${key}-title`)} className="copy-btn flex-shrink-0">
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
                            <button onClick={() => handleCopy(data.description || data.caption, `${key}-desc`)} className="copy-btn flex-shrink-0 mt-0.5">
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
                                const allTags = (data.tags || data.hashtags).map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' ');
                                handleCopy(allTags, `${key}-tags-all`);
                              }} 
                              className="copy-btn text-[10px] px-2 py-0.5"
                            >
                              {copied === `${key}-tags-all` ? "✓ Copied!" : "Copy All"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(data.tags || data.hashtags).map((t: string, i: number) => (
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
