"use client";

import { useState, useEffect } from "react";
import { fetchAllPackages } from "@/lib/api";

interface SidebarProps {
  onSelectPackage: (id: string) => void;
  activePackageId: string | null;
}

export default function Sidebar({ onSelectPackage, activePackageId }: SidebarProps) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPackages()
      .then(setPackages)
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  const scoreColor = (score: number) => {
    if (score >= 8) return "badge-green";
    if (score >= 6) return "badge-yellow";
    return "badge-red";
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-[#2a2a3d] flex flex-col" style={{ background: "#0d0d15" }}>
      {/* Header */}
      <div className="p-5 border-b border-[#2a2a3d]">
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
      <div className="px-5 py-3">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b7280" }}>
          Generated Packages
        </div>
      </div>

      {/* Package List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {loading ? (
          <div className="px-2 py-4 text-center text-xs" style={{ color: "#6b7280" }}>Loading history...</div>
        ) : packages.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs" style={{ color: "#6b7280" }}>No packages yet. Generate your first video!</div>
        ) : (
          packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => onSelectPackage(pkg.id)}
              className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                activePackageId === pkg.id
                  ? "bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.3)]"
                  : "hover:bg-[#1a1a28] border border-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate text-white">{pkg.topic || "AI Story"}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#6b7280" }}>
                    {pkg.language} · {pkg.video_clips?.length || 0} clips
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
