"use client";

import { useState, useEffect } from "react";
import { deletePackage, fetchAllPackages } from "@/lib/api";
import type { VideoPackage } from "@/lib/types";

interface SidebarProps {
  accessToken: string;
  onSelectPackage: (id: string) => void;
  onDeletePackage: (id: string) => void;
  activePackageId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ accessToken, onSelectPackage, onDeletePackage, activePackageId, isOpen, onClose }: SidebarProps) {
  const [packages, setPackages] = useState<VideoPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    let active = true;
    fetchAllPackages(accessToken)
      .then((items) => { if (active) setPackages(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load history."); })
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, [accessToken]);

  const scoreColor = (score: number) => {
    if (score >= 8) return "badge-green";
    if (score >= 6) return "badge-yellow";
    return "badge-red";
  };

  const handleDeletePackage = async (pkg: VideoPackage) => {
    const title = pkg.topic || "this project";
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;

    setDeleteError("");
    setDeletingPackageId(pkg.id);
    try {
      await deletePackage(accessToken, pkg.id);
      setPackages((current) => current.filter((item) => item.id !== pkg.id));
      onDeletePackage(pkg.id);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Could not delete this project.");
    } finally {
      setDeletingPackageId(null);
    }
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={onClose}
          aria-label="Close projects panel"
        />
      )}
      <aside
        id="projects-sidebar"
        aria-label="Projects"
        className={`${isOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 h-dvh w-[min(18rem,85vw)] flex-shrink-0 flex-col border-r border-[#2a2a3d] shadow-2xl md:relative md:z-auto md:flex md:h-auto md:max-h-none md:w-64 md:shadow-none`}
        style={{ background: "#0d0d15" }}
      >
      <div className="flex items-center justify-between border-b border-[#2a2a3d] px-4 py-3 md:hidden">
        <span className="text-sm font-semibold">Projects</span>
        <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-3 text-sm text-gray-300 hover:bg-[#1a1a28] hover:text-white">
          Done
        </button>
      </div>

      {/* Header */}
      <div className="hidden border-b border-[#2a2a3d] p-5 md:block">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
            🎬
          </div>
          <div>
            <div className="font-bold text-sm">ClipCraft Studio</div>
            <div className="text-xs" style={{ color: "#6b7280" }}>Short-Form Creator Studio</div>
          </div>
        </div>
      </div>

      {/* History Label */}
      <div className="hidden px-4 py-2 md:block md:px-5 md:py-3">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b7280" }}>
          Projects
        </div>
      </div>

      {/* Package List */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-2">
        {deleteError && <div role="alert" className="mx-1 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-200">{deleteError}</div>}
        {loading ? (
          <div className="px-2 py-4 text-center text-xs" style={{ color: "#6b7280" }}>Loading history...</div>
        ) : error ? (
          <div role="alert" className="px-2 py-3 text-xs text-red-300">{error}</div>
        ) : packages.length === 0 ? (
          <div className="px-2 py-3 text-xs" style={{ color: "#6b7280" }}>No saved projects yet.</div>
        ) : (
          packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`group flex min-w-0 items-center gap-1 rounded-xl border p-1 ${
                activePackageId === pkg.id
                  ? "border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.15)]"
                  : "border-transparent hover:bg-[#1a1a28]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectPackage(pkg.id);
                  onClose();
                }}
                className="min-h-11 min-w-0 flex-1 rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#c4b5fd]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-white">{pkg.topic || "Story draft"}</div>
                    <div className="mt-0.5 text-[10px]" style={{ color: "#9ca3af" }}>
                      {pkg.status === "awaiting_approval" || pkg.status === "needs_creator_review"
                        ? "Needs your review"
                        : pkg.status === "completed"
                          ? `${pkg.video_clips?.length || 0} prompt clips`
                          : pkg.status?.replaceAll("_", " ") || pkg.language}
                    </div>
                  </div>
                  {pkg.virality_score > 0 && (
                    <span className={`badge ${scoreColor(pkg.virality_score)} mt-0.5 flex-shrink-0`}>
                      Review {pkg.virality_score}/10
                    </span>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => void handleDeletePackage(pkg)}
                disabled={deletingPackageId === pkg.id}
                aria-label={`Delete ${pkg.topic || "project"}`}
                title="Delete project"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd] disabled:cursor-wait disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              >
                {deletingPackageId === pkg.id ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>
      </aside>
    </>
  );
}
