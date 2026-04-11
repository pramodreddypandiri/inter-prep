"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Session } from "@/types";
import Navbar from "@/components/Navbar";
import EditSessionModal from "@/components/EditSessionModal";
import Link from "next/link";
import {
  BookOpen,
  MessageSquare,
  ArrowRight,
  Briefcase,
  FileText,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jdExpanded, setJdExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getSession(sessionId);
        setSession(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load session"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-5 py-10">
          <p className="text-[var(--danger)]">{error || "Session not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 py-8 md:py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft size={12} />
            All Sessions
          </Link>
          <div className="flex items-start gap-3">
            <span className="mt-1 tag-primary px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0">
              <Briefcase size={12} />
              {session.company_name}
            </span>
            <h1
              className="text-2xl md:text-3xl font-extrabold leading-tight flex-1"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {session.name}
            </h1>
            <button
              onClick={() => setEditOpen(true)}
              className="btn-ghost !py-2 !px-3 !text-xs shrink-0"
            >
              <Pencil size={13} />
              Edit Session
            </button>
          </div>
        </div>

        {/* Session Details */}
        <div className="grid gap-4 md:grid-cols-2 animate-fade-in-up delay-1">
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5">
            <h3 className="font-bold mb-2.5 flex items-center gap-2 text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
              <div className="w-7 h-7 rounded-lg bg-[var(--primary-glow)] flex items-center justify-center">
                <Briefcase size={14} className="text-[var(--primary)]" />
              </div>
              Round Description
            </h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {session.round_description}
            </p>
          </div>
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5">
            <h3 className="font-bold mb-2.5 flex items-center gap-2 text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
                <FileText size={14} className="text-[var(--accent)]" />
              </div>
              Job Description
            </h3>
            <p className={`text-sm text-[var(--muted)] leading-relaxed ${jdExpanded ? "" : "line-clamp-6"}`}>
              {session.jd_text}
            </p>
            {session.jd_text && session.jd_text.length > 300 && (
              <button
                onClick={() => setJdExpanded((v) => !v)}
                className="mt-2 flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-semibold"
              >
                {jdExpanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show more</>}
              </button>
            )}
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-2 animate-fade-in-up delay-2">
          <Link
            href={`/sessions/${sessionId}/prepare`}
            className="gradient-border group bg-[var(--card)] rounded-2xl p-6 block"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary-glow)] flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-all">
                <BookOpen size={22} className="text-[var(--primary)]" />
              </div>
              <ArrowRight
                size={18}
                className="text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all"
              />
            </div>
            <h2
              className="text-xl font-extrabold mt-4 group-hover:text-[var(--primary)] transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Prepare
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed">
              AI-generated prep materials, study resources, and practice quizzes.
            </p>
          </Link>

          <Link
            href={`/sessions/${sessionId}/mock`}
            className="gradient-border group bg-[var(--card)] rounded-2xl p-6 block"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary-glow)] flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-all">
                <MessageSquare size={22} className="text-[var(--primary)]" />
              </div>
              <ArrowRight
                size={18}
                className="text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all"
              />
            </div>
            <h2
              className="text-xl font-extrabold mt-4 group-hover:text-[var(--primary)] transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Mock Interviews
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed">
              Realistic AI interviews with adaptive questions and feedback.
            </p>
          </Link>
        </div>
      </main>

      {editOpen && (
        <EditSessionModal
          session={session}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setSession(updated);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
