"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  approveStory,
  copyToClipboard,
  fetchPackageById,
  generatePackage,
  pollJobStatus,
  retryProduction,
  reviseStory,
} from "@/lib/api";
import type { VideoPackage } from "@/lib/types";
import { SAMPLE_PACKAGE } from "@/lib/sample-package";

interface DashboardProps {
  accessToken: string;
  activePackageId: string | null;
  onSelectPackage: (id: string | null) => void;
  onOpenChat: () => void;
  projectsOpen: boolean;
  onToggleProjects: () => void;
}

type Language = "Auto" | "English" | "Hindi" | "Nepali";

interface SelectOption {
  value: string;
  label: string;
}

interface CompactSelectProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  disabled: boolean;
  isOpen: boolean;
  onChange: (value: string) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}

function CompactSelect({
  id,
  label,
  value,
  options,
  disabled,
  isOpen,
  onChange,
  onOpen,
  onClose,
}: CompactSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const optionButtons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []
    );
    const currentIndex = optionButtons.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % optionButtons.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + optionButtons.length) % optionButtons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = optionButtons.length - 1;
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      triggerRef.current?.focus();
    }

    if (nextIndex !== null && optionButtons.length > 0) {
      event.preventDefault();
      optionButtons[nextIndex]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0 space-y-1">
      <span className="block text-xs font-medium text-gray-300">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? onClose() : onOpen(id)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            onOpen(id);
          }
        }}
        aria-label={`${label}: ${selectedOption?.label ?? value}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#2a2a3d] bg-[#12121a] px-3 py-2 text-left text-sm font-medium text-white transition-colors hover:border-[#51446f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          onKeyDown={handleListKeyDown}
          className="absolute left-0 top-full z-30 mt-2 max-h-[min(16rem,50vh)] w-full min-w-[min(12rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-[#3a334b] bg-[#15131d] p-1.5 shadow-2xl"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  onChange(option.value);
                  onClose();
                  triggerRef.current?.focus();
                }}
                className={`flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#c4b5fd] ${
                  selected ? "bg-purple-500/20 text-purple-100" : "text-gray-200 hover:bg-white/5"
                }`}
              >
                <span className="break-words">{option.label}</span>
                {selected && <span aria-hidden="true" className="ml-auto pl-2 text-purple-300">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ accessToken, activePackageId, onSelectPackage, onOpenChat, projectsOpen, onToggleProjects }: DashboardProps) {
  const [language, setLanguage] = useState<Language>("Auto");
  const [genre, setGenre] = useState<string>("");
  const [videoStyle, setVideoStyle] = useState<string>("");
  const [openSelector, setOpenSelector] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [targetDuration, setTargetDuration] = useState(60);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube", "tiktok", "instagram", "facebook"]);
  const [researchEnabled, setResearchEnabled] = useState(true);
  const [autoApproveStory, setAutoApproveStory] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>("idle"); // idle | queued | running | completed | failed
  const [loadedPackage, setPackage] = useState<VideoPackage | null>(null);
  const [activeTab, setActiveTab] = useState("research");
  const [copied, setCopied] = useState<string | null>(null);
  const [storyDraft, setStoryDraft] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [workflowError, setWorkflowError] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const autoApprovePendingRef = useRef(false);
  const package_ = activePackageId && loadedPackage?.id === activePackageId
    ? loadedPackage
    : showSample && !activePackageId ? SAMPLE_PACKAGE : null;

  // Load the selected, owner-scoped project.
  useEffect(() => {
    if (!activePackageId) return;
    let active = true;
    fetchPackageById(accessToken, activePackageId)
      .then((loaded) => {
        if (!active) return;
        setPackage(loaded);
        setStoryDraft(loaded.story || "");
        setLanguage(loaded.language as Language);
        setGenre((loaded.workflow_state?.genre as string) || "Funny");
        setVideoStyle((loaded.workflow_state?.video_style as string) || "Hyper-Realistic");
        setTopic((loaded.workflow_state?.creator_topic as string) || loaded.topic || "");
        setTargetDuration(loaded.target_duration || 60);
        setSelectedPlatforms(loaded.selected_platforms?.length ? loaded.selected_platforms : ["youtube", "tiktok", "instagram", "facebook"]);
        setResearchEnabled(Boolean(loaded.workflow_state?.research_enabled));
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
    if (!selectedPlatforms.length) {
      setWorkflowError("Choose at least one publishing platform.");
      return;
    }
    try {
      setShowSample(false);
      setWorkflowError("");
      setJobStatus("queued");
      setPackage(null);
      autoApprovePendingRef.current = autoApproveStory;
      const { job_id } = await generatePackage(accessToken, language, videoStyle, genre, topic.trim(), targetDuration, selectedPlatforms, researchEnabled);
      startPolling(job_id);
    } catch (error) {
      autoApprovePendingRef.current = false;
      setJobStatus("failed");
      setWorkflowError(error instanceof Error ? error.message : "Could not start story generation.");
    }
  };

  const handleRetryProduction = async () => {
    if (!package_?.id) return;
    try {
      setWorkflowError("");
      const result = await retryProduction(accessToken, package_.id);
      setJobStatus("generating_assets");
      setPackage((current) => current ? { ...current, status: "generating_assets", generation_error: null } : current);
      startPolling(result.job_id);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "Could not retry production.");
    }
  };

  const handleExport = () => {
    if (!package_) return;
    const content = [
      `# ${package_.topic}`,
      `\n${package_.target_duration || targetDuration} second short-form story package`,
      `\n## Approved story (version ${package_.approved_story_version || package_.current_story_version})\n\n${package_.story}`,
      "\n## Character reference prompts",
      ...(package_.characters || []).map((character) => `\n### ${character.name} (${character.role || "character"})\n\n${character.reference_prompt}`),
      "\n## Video prompts for external tools",
      ...(package_.video_clips || []).map((clip) => `\n### Clip ${clip.clip_number} · ${clip.time_range}\n\nVisual: ${clip.visual}\n\nVoice: ${clip.character_voice}\n\nMusic: ${clip.background_music}\n\nSound effects: ${clip.sound_effects}`),
      `\n## Thumbnail prompt\n\n${package_.thumbnail_prompt || "Not generated"}`,
      "\n## Publishing metadata",
      ...Object.entries(package_.seo_metadata || {}).map(([platform, metadata]) => `\n### ${platform}\n\n${JSON.stringify(metadata, null, 2)}`),
      "\n---\nPrompts and metadata only. ClipCraft did not render image or video files or publish this package.",
    ].join("\n");
    const blobUrl = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${(package_.topic || "clipcraft-package").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "clipcraft-package"}.md`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleApproveStory = useCallback(async () => {
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
  }, [accessToken, package_, startPolling]);

  useEffect(() => {
    if (
      autoApprovePendingRef.current
      && package_?.id
      && ["awaiting_approval", "needs_creator_review"].includes(package_.status)
    ) {
      autoApprovePendingRef.current = false;
      if (package_.status === "awaiting_approval") {
        queueMicrotask(() => { void handleApproveStory(); });
      }
    }
  }, [handleApproveStory, package_?.id, package_?.status]);

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
  const storyWordCount = storyDraft.trim() ? storyDraft.trim().split(/\s+/).length : 0;
  const estimatedSpeechSeconds = Math.round((storyWordCount / 150) * 60);
  const isViewingProject = Boolean(activePackageId || showSample);

  const handleNewStory = () => {
    setPackage(null);
    setStoryDraft("");
    setChangeRequest("");
    setTopic("");
    setLanguage("Auto");
    setGenre("");
    setVideoStyle("");
    setTargetDuration(60);
    setSelectedPlatforms(["youtube", "tiktok", "instagram", "facebook"]);
    setResearchEnabled(true);
    setShowSample(false);
    setJobStatus("idle");
    setActiveTab("research");
    setWorkflowError("");
    setOpenSelector(null);
    onSelectPackage(null);
  };

  return (
    <div className="min-h-full">
      {/* Top Header */}
      <div className="sticky top-0 z-10 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-x-3 gap-y-4 border-b border-[#2a2a3d] px-4 py-4 md:px-6 lg:px-8" style={{ background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)" }}>
        <button
          type="button"
          onClick={onToggleProjects}
          className="col-start-1 row-start-1 flex h-11 w-11 items-center justify-center rounded-lg border border-[#2a2a3d] text-gray-200 transition-colors hover:bg-[#1a1a28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd] md:hidden"
          aria-label={projectsOpen ? "Close projects panel" : "Open projects panel"}
          aria-expanded={projectsOpen}
          aria-controls="projects-sidebar"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="col-start-2 row-start-1 min-w-0 text-center text-xl font-bold gradient-text">ClipCraft Studio</h1>
        <span className="col-start-3 row-start-1" aria-hidden="true" />
        <div className="col-span-3 row-start-2 grid grid-cols-2 items-end gap-x-3 gap-y-2 xl:grid-cols-4 xl:gap-x-2">
          <CompactSelect
            id="language"
            label="Language"
            value={language}
            options={[
              { value: "Auto", label: "Auto (Best Market)" },
              { value: "English", label: "English" },
              { value: "Hindi", label: "Hindi" },
              { value: "Nepali", label: "Nepali" },
            ]}
            disabled={isGenerating}
            isOpen={openSelector === "language"}
            onChange={(value) => setLanguage(value as Language)}
            onOpen={setOpenSelector}
            onClose={() => setOpenSelector(null)}
          />

          <CompactSelect
            id="genre"
            label="Genre"
            value={genre}
            options={[
              { value: "", label: "Choose a genre" },
              { value: "Funny", label: "Funny" },
              { value: "Horror", label: "Horror" },
              { value: "Sci-Fi", label: "Sci-Fi" },
              { value: "Mystery", label: "Mystery" },
              { value: "Sad", label: "Sad" },
              { value: "Opposite World Funny", label: "Opposite World Funny" },
              { value: "Cute Kid Funny", label: "Cute Kid Funny" },
              { value: "Fruits & Veggies Funny", label: "Fruits & Veggies Funny" },
              { value: "Fruits & Veggies Emotion", label: "Fruits & Veggies Emotional" },
            ]}
            disabled={isGenerating}
            isOpen={openSelector === "genre"}
            onChange={setGenre}
            onOpen={setOpenSelector}
            onClose={() => setOpenSelector(null)}
          />

          <CompactSelect
            id="style"
            label="Visual style"
            value={videoStyle}
            options={[
              { value: "", label: "Choose a visual style" },
              { value: "Hyper-Realistic", label: "Hyper-Realistic" },
              { value: "3D Pixar Animation", label: "3D Pixar Animation" },
              { value: "Anime / Studio Ghibli", label: "Anime / Ghibli" },
              { value: "Dark Cinematic", label: "Dark Cinematic" },
            ]}
            disabled={isGenerating}
            isOpen={openSelector === "style"}
            onChange={setVideoStyle}
            onOpen={setOpenSelector}
            onClose={() => setOpenSelector(null)}
          />

          {/* Generate button */}
          <button
            type="button"
            onClick={isViewingProject ? handleNewStory : handleGenerate}
            disabled={isGenerating || (!isViewingProject && selectedPlatforms.length === 0)}
            className="btn-primary col-span-2 flex min-h-11 items-center justify-center gap-2 text-sm xl:col-span-1"
          >
            {isGenerating ? (
              <>
                <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-white" />
                Generating...
              </>
            ) : isViewingProject ? (
              <>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New story
              </>
            ) : (
              <>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
                  <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
                </svg>
                Generate story
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-5 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] md:p-8">
        {workflowError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <span>{workflowError}</span>
            <button type="button" onClick={() => setWorkflowError("")} className="min-h-11 rounded-lg px-3 text-white hover:bg-red-500/20">Dismiss</button>
          </div>
        )}
        <section className="card space-y-4 p-4 md:p-6" aria-labelledby="creative-brief-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="creative-brief-title" className="text-base font-semibold">Creative brief</h2>
              <p className="mt-1 text-sm text-gray-400">Your topic guides the story, and YouTube and public-web research add context.</p>
            </div>
            <span className="badge badge-green">Short-form · 30–90 sec</span>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            <span>Story idea <span className="text-gray-400">(optional)</span></span>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={1000}
              rows={5}
              disabled={isGenerating}
              placeholder="Share a premise, characters, key events, or ending—or leave blank and let AI invent a story."
              className="min-h-36 w-full resize-y rounded-xl border border-[#2a2a3d] bg-[#0a0a0f] px-4 py-3 text-base leading-relaxed text-white focus:border-purple-500 focus:outline-none"
            />
            <span className="block text-xs leading-relaxed text-gray-400">
              Genre and visual style are optional. Describe the tone or look you want here, or leave it blank and AI will decide from your other choices. {topic.length}/1000
            </span>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              <span>Target duration</span>
              <select value={targetDuration} onChange={(event) => setTargetDuration(Number(event.target.value))} disabled={isGenerating} className="min-h-11 w-full rounded-xl border border-[#2a2a3d] bg-[#0a0a0f] px-3 text-base text-white focus:border-purple-500 focus:outline-none">
                {[30, 40, 50, 60, 70, 80, 90].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds · {Math.ceil(seconds / 10)} clips</option>)}
              </select>
            </label>
            <fieldset className="space-y-2 text-sm font-medium">
              <legend>Prepare metadata for</legend>
              <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2">
                {[{ id: "youtube", label: "YouTube Shorts" }, { id: "tiktok", label: "TikTok" }, { id: "instagram", label: "Instagram Reels" }, { id: "facebook", label: "Facebook Reels" }].map((platform) => (
                  <label key={platform.id} className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={selectedPlatforms.includes(platform.id)} disabled={isGenerating} onChange={(event) => setSelectedPlatforms((current) => event.target.checked ? [...current, platform.id] : current.filter((item) => item !== platform.id))} className="h-4 w-4 accent-purple-500" />
                    {platform.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <label className="inline-flex min-h-11 items-center gap-3 text-sm text-gray-300">
            <input type="checkbox" checked={researchEnabled} disabled={isGenerating} onChange={(event) => setResearchEnabled(event.target.checked)} className="h-4 w-4 accent-purple-500" />
            Add YouTube and public web research to inform your story
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm text-gray-300">
            <input type="checkbox" checked={autoApproveStory} disabled={isGenerating} onChange={(event) => setAutoApproveStory(event.target.checked)} className="mt-1 h-4 w-4 accent-purple-500" />
            <span>
              <span className="block font-medium text-gray-200">Auto-approve the AI story</span>
              <span className="block text-xs leading-relaxed text-gray-400">Skip the approval step and immediately generate the production prompts when the review passes.</span>
            </span>
          </label>
        </section>
        {/* Empty state */}
        {!package_ && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold gradient-text mb-2">Ready to Create</h2>
            <p className="max-w-md text-sm leading-relaxed" style={{ color: "#6b7280" }}>
              Add an idea above, or leave it blank and let AI create a story from your choices. Review and approve it before ClipCraft prepares production prompts.
            </p>
            <button type="button" onClick={() => setShowSample(true)} className="mt-2 min-h-11 rounded-xl px-5 text-sm text-gray-300 underline decoration-gray-600 underline-offset-4 hover:text-white">Explore a labeled sample package</button>
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
                const isCompleted = package_?.workflow_state?.completed_steps?.includes(step.id);
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
            {showSample && <div className="rounded-xl border border-sky-300/20 bg-sky-300/5 p-4 text-sm text-sky-100"><strong>Sample package.</strong> This fixture is illustrative; no live model generation, research, or image/video rendering occurred.</div>}
            {/* Package header */}
            <div className="card p-4 md:p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold">{package_.topic}</h2>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="tag">{package_.language}</span>
                    <span className="tag">{String(package_.workflow_state?.genre || genre)}</span>
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
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleExport} className="min-h-11 rounded-xl border border-[#2a2a3d] px-4 text-sm text-gray-200 hover:border-purple-400">Download package</button>
                    <button onClick={onOpenChat} className="btn-primary min-h-11 text-sm">Fix a prompt</button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-gray-400">
                Editorial scores are review heuristics, not predictions of reach or performance.
              </p>
            </div>

            {package_.generation_error && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                <div><strong>Production stopped.</strong> {package_.generation_error}</div>
                {package_.story_approved && <button type="button" onClick={handleRetryProduction} className="min-h-11 rounded-lg border border-red-200/40 px-4 font-semibold hover:bg-red-500/20">Retry production kit</button>}
              </div>
            )}

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
                {package_.research_brief?.status === "skipped" ? (
                  <div className="rounded-xl border border-sky-300/20 bg-sky-300/5 p-4 text-sm text-sky-100">Research was skipped for this package. The story uses your topic directly; no trend or source claims were added.</div>
                ) : package_.research_errors?.length ? (
                  <div role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">Some research sources were unavailable. The creator topic is still used for the story. {package_.research_errors.map((error, index) => <p key={index} className="mt-2">{String(error.stage || "Source")}: {String(error.message || "request failed")}</p>)}</div>
                ) : null}
                <div className="card p-6 space-y-4">
                  <h3 className="font-semibold text-base">Research context and source signals</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-lg" style={{ background: "#0a0a0f" }}>
                      <div className="text-xs mb-1" style={{ color: "#6b7280" }}>Winning Topic</div>
                      <div className="text-sm font-semibold gradient-text">{package_.topic}</div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: "#0a0a0f" }}>
                      <div className="text-xs mb-1" style={{ color: "#6b7280" }}>Google Trends score</div>
                      <div className="text-sm font-semibold">{package_.research_brief?.status === "skipped" ? "Research skipped" : (package_.trend_scores?.[package_.topic] ?? "No score available")}</div>
                    </div>
                  </div>
                </div>
                
                <h3 className="font-semibold text-base mt-6">Public YouTube search results</h3>
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
                <p className="text-xs text-gray-400">{storyWordCount} words · about {estimatedSpeechSeconds} sec at 150 words/min · target {package_.target_duration || 60} sec</p>
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
              <div className="space-y-5">
                <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-relaxed text-amber-100">Image generation is not configured. The character cards below contain prompts for external image tools; no image files were created.</div>
                <h3 className="text-lg font-semibold leading-snug">🎭 Character Reference Prompts</h3>
                {(package_.characters || []).map((char, i) => (
                  <div key={i} className="card min-w-0 space-y-4 p-4 sm:p-5">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="text-base font-semibold leading-snug">{char.name}</div>
                        <div className="flex min-w-0 flex-wrap gap-2">
                          <span className="tag inline-block max-w-full whitespace-normal break-words leading-5">{char.role}</span>
                          <span className="tag inline-block max-w-full whitespace-normal break-words leading-5">🎤 {char.voice_style}</span>
                        </div>
                      </div>
                      <button onClick={() => handleCopy(char.reference_prompt, `char-${i}`)} className="copy-btn w-full whitespace-nowrap sm:w-auto">
                        {copied === `char-${i}` ? "✓ Copied!" : "Copy Prompt"}
                      </button>
                    </div>
                    <p className="min-w-0 whitespace-pre-wrap break-words rounded-lg border border-[#2a2a3d] p-4 text-sm leading-7" style={{ background: "#0a0a0f", color: "#c4b5fd", fontFamily: "monospace", overflowWrap: "anywhere" }}>
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
                  Image generation is not configured. Copy this prompt to an external image tool; ClipCraft created text only. Set aspect ratio to <strong>9:16</strong> for vertical short-form content.
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
