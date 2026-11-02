"use client";

import { useState, useEffect } from "react";
import { fetchAllPackages } from "@/lib/api";
import type { VideoPackage } from "@/lib/types";

interface SidebarProps {
  accessToken: string;
  onSelectPackage: (id: string) => void;
  activePackageId: string | null;
}

export default function Sidebar({ accessToken, onSelectPackage, activePackageId }: SidebarProps) {
  const [packages, setPackages] = useState<VideoPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <aside className="flex max-h-40 w-full flex-shrink-0 flex-col border-b border-[#2a2a3d] md:max-h-none md:w-64 md:border-b-0 md:border-r" style={{ background: "#0d0d15" }}>
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
      <div className="px-4 py-2 md:px-5 md:py-3">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b7280" }}>
          Projects
        </div>
      </div>

      {/* Package List */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-2">
        {loading ? (
          <div className="px-2 py-4 text-center text-xs" style={{ color: "#6b7280" }}>Loading history...</div>
        ) : error ? (
          <div role="alert" className="px-2 py-3 text-xs text-red-300">{error}</div>
        ) : packages.length === 0 ? (
          <div className="px-2 py-3 text-xs" style={{ color: "#6b7280" }}>No saved projects yet.</div>
        ) : (
          packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => onSelectPackage(pkg.id)}
              className={`min-h-11 w-full rounded-xl p-3 text-left transition-all duration-200 group ${
                activePackageId === pkg.id
                  ? "bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.3)]"
                  : "hover:bg-[#1a1a28] border border-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-white">{pkg.topic || "Story draft"}</div>
                  <div className="mt-0.5 text-[10px]" style={{ color: "#6b7280" }}>
                    {pkg.status === "awaiting_approval" || pkg.status === "needs_creator_review"
                      ? "Needs your review"
                      : pkg.status === "completed"
                        ? `${pkg.video_clips?.length || 0} prompt clips`
                        : pkg.status?.replaceAll("_", " ") || pkg.language}
                  </div>
                </div>
                {pkg.virality_score > 0 && (
                  <span className={`badge ${scoreColor(pkg.virality_score)} flex-shrink-0 mt-0.5`}>
                    Review {pkg.virality_score}/10
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
