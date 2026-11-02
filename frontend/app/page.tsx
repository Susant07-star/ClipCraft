"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import Dashboard from "@/components/Dashboard";
import Sidebar from "@/components/Sidebar";
import Chatbox from "@/components/Chatbox";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activePackageId, setActivePackageId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    void Promise.resolve().then(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event: AuthChangeEvent, nextSession: Session | null) => {
            if (!active) return;
            setSession(nextSession);
            if (event === "SIGNED_OUT") {
              setActivePackageId(null);
              setChatOpen(false);
            }
          }
        );
        unsubscribe = () => subscription.unsubscribe();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        let currentSession = data.session;
        if (!currentSession) {
          const result = await supabase.auth.signInAnonymously();
          if (result.error) {
            throw new Error(
              `Could not start a guest session. Enable Anonymous Sign-Ins in the Supabase project's Authentication settings. ${result.error.message}`
            );
          }
          currentSession = result.data.session;
        }
        if (!currentSession) {
          throw new Error("Supabase did not return a session for this browser.");
        }
        if (!active) return;
        setAuthError(null);
        setSession(currentSession);
      } catch (error) {
        if (active) {
          setAuthError(error instanceof Error ? error.message : "Supabase configuration is missing.");
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (authLoading) {
    return <main className="min-h-dvh flex items-center justify-center text-sm text-gray-400">Starting your private workspace…</main>;
  }

  if (authError && !session) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <section role="alert" className="card w-full max-w-lg p-6 sm:p-8">
          <p className="text-sm font-semibold gradient-text">ClipCraft Studio</p>
          <h1 className="mt-2 text-2xl font-bold">Could not start your workspace</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            Guest access uses a private Supabase session saved in this browser.
            Check the Supabase URL and public key, and make sure Anonymous
            Sign-Ins are enabled under Authentication settings.
          </p>
          <p className="mt-3 break-words text-sm text-red-200">{authError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-6 min-h-11 w-full"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <Sidebar
        accessToken={session.access_token}
        onSelectPackage={setActivePackageId}
        activePackageId={activePackageId}
      />
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <Dashboard
          accessToken={session.access_token}
          isAnonymous={Boolean(session.user.is_anonymous)}
          activePackageId={activePackageId}
          onSelectPackage={setActivePackageId}
          onOpenChat={() => setChatOpen(true)}
        />
      </main>
      {chatOpen && (
        <Chatbox
          accessToken={session.access_token}
          packageId={activePackageId}
          onClose={() => setChatOpen(false)}
        />
      )}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="btn-primary fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-2xl md:bottom-6 md:right-6"
          title="Open Prompt Fix Assistant"
          aria-label="Open Prompt Fix Assistant"
        >
          💬
        </button>
      )}
    </div>
  );
}
