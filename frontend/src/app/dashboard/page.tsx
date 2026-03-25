"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Session } from "@/types";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Briefcase, Clock, Trash2, Plus, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadSessions() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const data = await api.getSessions(user.id);
        setSessions(data);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [supabase.auth]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 animate-fade-in">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-medium mb-2">
              Dashboard
            </p>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Your Sessions
            </h1>
          </div>
          <Link
            href="/sessions/new"
            className="btn-shine flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary-glow)]"
          >
            <Plus size={15} strokeWidth={2.5} />
            New Session
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[var(--muted)]">
              <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading sessions...</span>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="animate-fade-in-up text-center py-24 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]/50">
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary-glow)] flex items-center justify-center mx-auto mb-5">
              <Sparkles size={28} className="text-[var(--primary)]" />
            </div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              No sessions yet
            </h2>
            <p className="text-[var(--muted)] text-sm mb-6 max-w-sm mx-auto">
              Create your first interview session to start preparing with
              AI-powered research and practice.
            </p>
            <Link
              href="/sessions/new"
              className="btn-shine inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary-glow)]"
            >
              <Plus size={16} />
              Create Your First Session
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session, i) => (
              <div
                key={session.id}
                className={`card-hover border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 group animate-fade-in-up delay-${Math.min(i + 1, 6)}`}
              >
                <Link
                  href={`/sessions/${session.id}`}
                  className="block space-y-4"
                >
                  {/* Company badge */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--primary-glow)] text-[var(--primary)] rounded-md text-xs font-medium">
                      <Briefcase size={12} />
                      {session.company_name}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-semibold text-lg group-hover:text-[var(--primary)] transition-colors leading-snug"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {session.name}
                  </h3>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <Clock size={11} />
                    {new Date(session.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </Link>

                {/* Delete */}
                <div className="pt-4 mt-4 border-t border-[var(--card-border)]">
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
