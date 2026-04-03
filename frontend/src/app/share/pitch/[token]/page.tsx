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
  if (score === null) return "#6b7280";
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? score / 100 : 0;
  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx="54" cy="54" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
      <circle
        cx="54"
        cy="54"
        r={r}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 54 54)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="54"
        y="60"
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fill={scoreColor(score)}
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
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444",
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !recording) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-5">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Mic size={28} className="text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Recording not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          This share link may have expired or been removed.
        </p>
        <Link href="/" className="text-emerald-600 text-sm hover:underline flex items-center gap-1">
          <ExternalLink size={13} />
          Back to InterviewAce
        </Link>
      </div>
    );
  }

  const feedback = recording.feedback as PitchFeedback | null;
  const dims = feedback?.dimensions;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <Mic size={16} />
            InterviewAce
          </Link>
          <span className="text-xs text-gray-400">Shared Elevator Pitch</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        {/* Role / company */}
        <div className="mb-6 text-center">
          <h1
            className="text-2xl font-extrabold text-gray-900 mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {recording.target_role || "Elevator Pitch"}
          </h1>
          {recording.company_name && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Briefcase size={12} />
              {recording.company_name}
            </span>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(recording.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>·</span>
            <span>
              {recording.duration_seconds}s
            </span>
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
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-100 border border-gray-200 mb-6 p-8 text-center">
            <Mic size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No video available for this recording</p>
          </div>
        )}

        {/* Score */}
        {feedback && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-4">
              <Star size={14} className="text-emerald-500" />
              <h2 className="font-bold text-sm text-gray-700 uppercase tracking-wide">
                Pitch Score
              </h2>
            </div>

            <div className="flex gap-6 items-start">
              <div className="shrink-0">
                <ScoreRing score={feedback.overall_score} />
                <p className="text-xs text-center text-gray-400 mt-1">/ 100</p>
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
              className="mt-5 flex items-center gap-1.5 text-xs text-emerald-600 hover:underline"
            >
              {feedbackExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {feedbackExpanded ? "Hide" : "Show"} feedback details
            </button>

            {feedbackExpanded && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                {feedback.timing_note && (
                  <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">
                    {feedback.timing_note}
                  </p>
                )}

                {feedback.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wide">
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.improvements?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 mb-2 uppercase tracking-wide">
                      Improvements
                    </p>
                    <ul className="space-y-1">
                      {feedback.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-red-400 mt-0.5">↑</span>
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
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Transcript
            </p>
            <p className="text-sm text-gray-700 leading-relaxed italic">
              "{recording.transcript}"
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 mb-3">Want to practice your own elevator pitch?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Mic size={14} />
            Try InterviewAce
          </Link>
        </div>
      </main>
    </div>
  );
}
