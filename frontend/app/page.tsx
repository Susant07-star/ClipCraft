"use client";

import { useState, useEffect } from "react";
import Dashboard from "@/components/Dashboard";
import Sidebar from "@/components/Sidebar";
import Chatbox from "@/components/Chatbox";

export default function Home() {
  const [activePackageId, setActivePackageId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onSelectPackage={setActivePackageId}
        activePackageId={activePackageId}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <Dashboard
          activePackageId={activePackageId}
          onSelectPackage={setActivePackageId}
          onOpenChat={() => setChatOpen(true)}
        />
      </main>

      {/* Floating Chatbox */}
      {chatOpen && (
        <Chatbox
          packageId={activePackageId}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Chat toggle button (always visible) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 btn-primary rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-2xl"
          title="Open AI Assistant"
        >
          💬
        </button>
      )}
    </div>
  );
}
