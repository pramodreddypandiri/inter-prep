"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Session } from "@/types";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  Briefcase,
  Clock,
  Trash2,
  Plus,
  Sparkles,
  LayoutGrid,
  MessageSquare,
  Brain,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserName(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        ""
      );

      try {
        const data = await api.getSessions();
        setSessions(data);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 py-8 md:py-10">
        {/* Welcome header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1
                className="text-2xl md:text-3xl font-extrabold tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {greeting()}{userName ? `, ${userName}` : ""}
              </h1>
              <p className="text-[var(--muted)] text-sm mt-1">
                {sessions.length > 0
                  ? `You have ${sessions.length} interview session${sessions.length !== 1 ? "s" : ""}`
                  : "Start your first interview prep session"}
              </p>
            </div>
            <Link href="/sessions/new" className="btn-shine btn-primary shrink-0">
              <Plus size={15} strokeWidth={2.5} />
              New Session
            </Link>
          </div>
        </div>

        {/* Stats row */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8 animate-fade-in-up delay-1">
            {[
              { label: "Sessions", value: sessions.length, icon: LayoutGrid, color: "var(--primary)" },
              { label: "Preparing", value: sessions.length, icon: Brain, color: "var(--accent)" },
              { label: "Active", value: sessions.filter(s => {
                const created = new Date(s.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created > weekAgo;
              }).length, icon: MessageSquare, color: "var(--success)" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-4 md:p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `color-mix(in srgb, ${stat.color} 12%, transparent)` }}
                  >
                    <stat.icon size={14} style={{ color: stat.color }} />
                  </div>
                  <span className="text-xs text-[var(--muted)] font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[var(--muted)]">
              <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading sessions...</span>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="animate-fade-in-up text-center py-20 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary-glow)] flex items-center justify-center mx-auto mb-5">
              <Sparkles size={28} className="text-[var(--primary)]" />
            </div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              No sessions yet
            </h2>
            <p className="text-[var(--muted)] text-sm mb-6 max-w-sm mx-auto">
              Create your first interview session to start preparing with
              AI-powered research and practice.
            </p>
            <Link href="/sessions/new" className="btn-shine btn-primary">
              <Plus size={16} />
              Create Your First Session
            </Link>
          </div>
        ) : (
          <>
            {/* Continue where you left off */}
            {sessions.length > 0 && (
              <div className="mb-6 animate-fade-in-up delay-2">
                <Link
                  href={`/sessions/${sessions[0].id}`}
                  className="gradient-border block rounded-2xl bg-[var(--card)] p-5 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary-glow)] flex items-center justify-center">
                        <ArrowRight size={18} className="text-[var(--primary)] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--primary)] font-semibold tracking-wide uppercase">
                          Continue where you left off
                        </p>
                        <p className="font-bold text-sm mt-0.5" style={{ fontFamily: "'Syne', sans-serif" }}>
                          {sessions[0].name}
                        </p>
                      </div>
                    </div>
                    <span className="tag-primary px-2.5 py-1 text-xs rounded-lg font-medium hidden sm:flex items-center gap-1.5">
                      <Briefcase size={11} />
                      {sessions[0].company_name}
                    </span>
                  </div>
                </Link>
              </div>
            )}

            {/* Session grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session, i) => (
                <div
                  key={session.id}
                  className={`gradient-border bg-[var(--card)] rounded-2xl p-5 group animate-fade-in-up delay-${Math.min(i + 1, 6)}`}
                >
                  <Link
                    href={`/sessions/${session.id}`}
                    className="block space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="tag-primary px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
                        <Briefcase size={11} />
                        {session.company_name}
                      </span>
                    </div>

                    <h3
                      className="font-bold text-base group-hover:text-[var(--primary)] transition-colors leading-snug"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {session.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <Clock size={11} />
                      {new Date(session.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </Link>

                  <div className="pt-3 mt-3 border-t border-[var(--card-border)]">
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
          </>
        )}
      </main>
    </div>
  );
}
