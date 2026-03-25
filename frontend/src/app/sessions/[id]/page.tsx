"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Session } from "@/types";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  BookOpen,
  MessageSquare,
  ArrowRight,
  Briefcase,
  FileText,
  ArrowLeft,
} from "lucide-react";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        <div className="max-w-4xl mx-auto px-6 py-10">
          <p className="text-[var(--danger)]">{error || "Session not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
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
            <span className="mt-1 flex items-center gap-1.5 px-2.5 py-1 bg-[var(--primary-glow)] text-[var(--primary)] rounded-md text-xs font-medium shrink-0">
              <Briefcase size={12} />
              {session.company_name}
            </span>
            <h1
              className="text-3xl font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {session.name}
            </h1>
          </div>
        </div>

        {/* Session Details */}
        <div className="grid gap-5 md:grid-cols-2 animate-fade-in-up delay-1">
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6">
            <h3
              className="font-semibold mb-3 flex items-center gap-2 text-sm"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <div className="w-7 h-7 rounded-lg bg-[var(--primary-glow)] flex items-center justify-center">
                <Briefcase size={14} className="text-[var(--primary)]" />
              </div>
              Round Description
            </h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {session.round_description}
            </p>
          </div>
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6">
            <h3
              className="font-semibold mb-3 flex items-center gap-2 text-sm"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <FileText size={14} className="text-[var(--primary)]" />
              </div>
              Job Description
            </h3>
            <p className="text-sm text-[var(--muted)] line-clamp-6 leading-relaxed">
              {session.jd_text}
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-5 md:grid-cols-2 animate-fade-in-up delay-2">
          <Link
            href={`/sessions/${sessionId}/prepare`}
            className="card-hover group border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-7 block"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary-glow)] flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                <BookOpen size={22} className="text-[var(--primary)]" />
              </div>
              <ArrowRight
                size={18}
                className="text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all"
              />
            </div>
            <h2
              className="text-xl font-bold mt-5 group-hover:text-[var(--primary)] transition-colors"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Prepare
            </h2>
            <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
              AI-generated prep materials, study resources, and practice quizzes
              to get you interview-ready.
            </p>
          </Link>

          <Link
            href={`/sessions/${sessionId}/mock`}
            className="card-hover group border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-7 block"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                <MessageSquare size={22} className="text-[var(--primary)]" />
              </div>
              <ArrowRight
                size={18}
                className="text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all"
              />
            </div>
            <h2
              className="text-xl font-bold mt-5 group-hover:text-[var(--primary)] transition-colors"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Mock Interviews
            </h2>
            <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
              Realistic AI-conducted interviews with adaptive questions and
              detailed feedback reports.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
