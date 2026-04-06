"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { PitchRecording, PitchFeedback } from "@/types";
import {
  Mic,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Briefcase,
  ExternalLink,
} from "lucide-react";

function scoreColor(score: number | null): string {
  if (score === null) return "var(--muted)";
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--accent)";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? score / 100 : 0;
  const color = scoreColor(score);
  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx="54" cy="54" r={r} fill="none" style={{ stroke: "var(--card-border)" }} strokeWidth="7" />
      <circle
        cx="54"
        cy="54"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 54 54)"
        style={{ stroke: color, transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="54"
        y="60"
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fontFamily="'Syne', sans-serif"
        style={{ fill: color }}
      >
        {score !== null ? score : "—"}
      </text>
    </svg>
  );
}

function DimensionBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--muted)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--foreground)]">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              pct >= 75
                ? "var(--success)"
                : pct >= 50
                ? "var(--warning)"
                : "var(--danger)",
          }}
        />
      </div>
    </div>
  );
}

export default function SharePitchPage() {
  const { token } = useParams<{ token: string }>();
  const [recording, setRecording] = useState<
    (PitchRecording & { target_role?: string; company_name?: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(true);

  useEffect(() => {
    api
      .getSharedRecording(token)
      .then(setRecording)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !recording) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-center px-5">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-4">
          <Mic size={28} className="text-[var(--muted)]" />
        </div>
        <h1
          className="text-xl font-bold text-[var(--foreground)] mb-2"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Recording not found
        </h1>
        <p className="text-[var(--muted)] text-sm mb-6">
          This share link may have expired or been removed.
        </p>
        <Link
          href="/"
          className="text-[var(--primary)] text-sm hover:underline flex items-center gap-1"
        >
          <ExternalLink size={13} />
          Back to InterviewAce
        </Link>
      </div>
    );
  }

  const feedback = recording.feedback as PitchFeedback | null;
  const dims = feedback?.dimensions;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header bar */}
      <header className="bg-[var(--card)] border-b border-[var(--card-border)] px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--primary)] font-bold text-sm"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            <Mic size={16} />
            InterviewAce
          </Link>
          <span className="text-xs text-[var(--muted)]">Shared Elevator Pitch</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        {/* Role / company */}
        <div className="mb-6 text-center">
          <h1
            className="text-2xl font-extrabold text-[var(--foreground)] mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {recording.target_role || "Elevator Pitch"}
          </h1>
          {recording.company_name && (
            <span className="inline-flex items-center gap-1 text-sm text-[var(--primary)] tag-primary px-3 py-1 rounded-full">
              <Briefcase size={12} />
              {recording.company_name}
            </span>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(recording.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>·</span>
            <span>{recording.duration_seconds}s</span>
          </div>
        </div>

        {/* Video player */}
        {recording.video_url ? (
          <div className="rounded-2xl overflow-hidden bg-black mb-6 shadow-lg">
            <video
              src={recording.video_url}
              controls
              autoPlay={false}
              className="w-full max-h-72 object-contain"
              aria-label={`Elevator pitch recording${recording.target_role ? ` for ${recording.target_role}` : ""}`}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--card-border)] mb-6 p-8 text-center">
            <Mic size={28} className="text-[var(--muted)] mx-auto mb-2 opacity-40" />
            <p className="text-sm text-[var(--muted)]">No video available for this recording</p>
          </div>
        )}

        {/* Score */}
        {feedback && (
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-6 mb-4">
            <div className="flex items-center gap-1.5 mb-4">
              <Star size={14} className="text-[var(--accent)]" />
              <h2
                className="font-bold text-sm text-[var(--foreground)] uppercase tracking-wide"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Pitch Score
              </h2>
            </div>

            <div className="flex gap-6 items-start">
              <div className="shrink-0">
                <ScoreRing score={feedback.overall_score} />
                <p className="text-xs text-center text-[var(--muted)] mt-1">/ 100</p>
              </div>
              {dims && (
                <div className="flex-1 space-y-2">
                  <DimensionBar label="Opening Hook" value={dims.opening_hook} max={15} />
                  <DimensionBar label="Identity Clarity" value={dims.identity_clarity} max={15} />
                  <DimensionBar label="Value Proposition" value={dims.value_proposition} max={20} />
                  <DimensionBar label="Unique Differentiator" value={dims.unique_differentiator} max={20} />
                  <DimensionBar label="Role Fit" value={dims.role_fit} max={15} />
                  <DimensionBar label="Call to Action" value={dims.call_to_action} max={10} />
                  <DimensionBar label="Delivery" value={dims.delivery} max={5} />
                </div>
              )}
            </div>

            {/* Toggle detailed feedback */}
            <button
              onClick={() => setFeedbackExpanded((p) => !p)}
              className="mt-5 flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
            >
              {feedbackExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {feedbackExpanded ? "Hide" : "Show"} feedback details
            </button>

            {feedbackExpanded && (
              <div className="mt-4 space-y-4 border-t border-[var(--card-border)] pt-4">
                {feedback.timing_note && (
                  <p className="text-xs text-[var(--muted)] italic border-l-2 border-[var(--card-border)] pl-3">
                    {feedback.timing_note}
                  </p>
                )}

                {feedback.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--success)] mb-2 uppercase tracking-wide">
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                          <span className="text-[var(--success)] mt-0.5">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.improvements?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--danger)] mb-2 uppercase tracking-wide">
                      Improvements
                    </p>
                    <ul className="space-y-1">
                      {feedback.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-[var(--foreground)] flex gap-2">
                          <span className="text-[var(--danger)] mt-0.5">↑</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transcript */}
        {recording.transcript && (
          <figure className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5 m-0">
            <figcaption className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">
              Transcript
            </figcaption>
            <p className="text-sm text-[var(--foreground)] leading-relaxed italic">
              &ldquo;{recording.transcript}&rdquo;
            </p>
          </figure>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--muted)] mb-3">
            Want to practice your own elevator pitch?
          </p>
          <Link
            href="/"
            className="btn-shine btn-primary inline-flex items-center gap-2"
          >
            <Mic size={14} aria-hidden="true" />
            Try InterviewAce
          </Link>
        </div>
      </main>
    </div>
  );
}
