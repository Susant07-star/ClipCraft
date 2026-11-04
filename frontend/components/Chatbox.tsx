"use client";

import { useState, useRef, useEffect } from "react";
import { fixPrompt, copyToClipboard } from "@/lib/api";
import type { VideoClip } from "@/lib/types";

interface ChatboxProps {
  accessToken: string;
  packageId: string | null;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  fixedClip?: VideoClip;
}

export default function Chatbox({ accessToken, packageId, onClose }: ChatboxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: packageId
        ? "Hi! I can help revise a clip prompt that failed in your video-generation tool. Tell me the clip number and what went wrong."
        : "Please generate a video package first, then I can help you fix specific prompts.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !packageId) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Parse clip number from the message
      const clipMatch = userMessage.match(/clip\s*#?\s*(\d+)|prompt\s*#?\s*(\d+)|(\d+)/i);
      const clipNumber = clipMatch ? parseInt(clipMatch[1] || clipMatch[2] || clipMatch[3]) : 1;

      const result = await fixPrompt(accessToken, packageId, clipNumber, userMessage);
      const fixedClip = result.fixed_clip;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Here's the regenerated Clip #${fixedClip.clip_number} (${fixedClip.time_range}):`,
          fixedClip,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Make sure the backend is running and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (clip: VideoClip, idx: number) => {
    copyToClipboard(
      `[VISUAL]: ${clip.visual}\n\n[CHARACTER VOICE]: ${clip.character_voice}\n\n[BACKGROUND MUSIC]: ${clip.background_music}\n\n[SOUND EFFECTS]: ${clip.sound_effects}`
    );
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 flex flex-col rounded-2xl shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 md:bottom-6 md:right-6"
      style={{
        width: "min(420px, calc(100vw - 2rem))",
        height: "min(560px, calc(100dvh - env(safe-area-inset-bottom) - 1rem))",
        background: "#12121a",
        border: "1px solid #2a2a3d",
        boxShadow: "0 0 40px rgba(124,58,237,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a3d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
            🤖
          </div>
          <div>
            <div className="text-sm font-semibold">Prompt Fix Assistant</div>
            <div className="text-xs" style={{ color: "#6b7280" }}>
              {packageId ? "Ready to revise a clip prompt" : "No package selected"}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a28]"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "rounded-tr-sm"
                  : "rounded-tl-sm"
              }`}
              style={{
                background: msg.role === "user" ? "linear-gradient(135deg, #7c3aed, #9333ea)" : "#1a1a28",
                color: "white",
              }}
            >
              <div className="leading-relaxed">{msg.content}</div>

              {/* Fixed clip display */}
              {msg.fixedClip && (
                <div className="mt-3 space-y-2 text-xs">
                  {msg.fixedClip.characters_to_attach && msg.fixedClip.characters_to_attach.length > 0 && (
                    <div style={{ color: "#fbbf24" }}>📎 Attach: {msg.fixedClip.characters_to_attach.join(", ")}</div>
                  )}
                  {[
                    { label: "🎥 VISUAL", value: msg.fixedClip.visual },
                    { label: "🎤 VOICE", value: msg.fixedClip.character_voice },
                    { label: "🎵 MUSIC", value: msg.fixedClip.background_music },
                    { label: "🔊 SFX", value: msg.fixedClip.sound_effects },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <div className="font-bold mb-0.5" style={{ color: "#a78bfa", fontSize: "9px" }}>{label}</div>
                      <div>{value}</div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const clip = msg.fixedClip;
                      if (clip) handleCopy(clip, i);
                    }}
                    className="copy-btn w-full mt-1 text-center"
                  >
                    {copied === i ? "✓ Copied!" : "Copy Full Prompt"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm" style={{ background: "#1a1a28" }}>
              <div className="flex gap-1 items-center">
                <span className="pulse-dot w-2 h-2 rounded-full bg-purple-500 inline-block" />
                <span className="pulse-dot w-2 h-2 rounded-full bg-purple-500 inline-block" style={{ animationDelay: "0.2s" }} />
                <span className="pulse-dot w-2 h-2 rounded-full bg-purple-500 inline-block" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2a2a3d]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={packageId ? 'e.g. "Clip 3 mixed voices, fix it"' : "Generate a package first"}
            disabled={!packageId || loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#7c3aed] transition-colors"
            style={{ background: "#0a0a0f", border: "1px solid #2a2a3d", color: "white" }}
          />
          <button
            onClick={handleSend}
            disabled={!packageId || loading || !input.trim()}
            className="btn-primary px-4 py-2.5 text-sm rounded-xl"
          >
            ↑
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "#4b5563" }}>
          Tell me the clip number and what went wrong in your video tool
        </p>
      </div>
    </div>
  );
}
