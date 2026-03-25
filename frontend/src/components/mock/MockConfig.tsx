"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

interface MockConfigProps {
  sessionId: string;
}

const difficulties = [
  { value: "beginner", label: "Beginner", desc: "Entry-level questions" },
  { value: "intermediate", label: "Intermediate", desc: "Mid-level depth" },
  { value: "senior", label: "Senior", desc: "Senior-level expectations" },
  { value: "staff", label: "Staff+", desc: "Staff/Principal level" },
];

const durations = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

export default function MockConfig({ sessionId }: MockConfigProps) {
  const [topics, setTopics] = useState("");
  const [duration, setDuration] = useState(30);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleStart = async () => {
    if (!topics.trim()) {
      setError("Please specify topics or focus areas");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const mock = await api.createMockInterview(sessionId, {
        topics,
        duration,
        difficulty,
      });
      router.push(`/sessions/${sessionId}/mock/${mock.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start interview"
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3
        className="text-lg font-semibold"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Configure Mock Interview
      </h3>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
          Topics / Focus Areas
        </label>
        <textarea
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm resize-y leading-relaxed"
          placeholder='e.g. "system design and one behavioral question"'
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
          Duration
        </label>
        <div className="flex gap-2">
          {durations.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              className={`px-5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                duration === d.value
                  ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]"
                  : "border-[var(--card-border)] hover:border-[var(--primary)]/30 text-[var(--muted)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
          Difficulty
        </label>
        <div className="grid gap-2 sm:grid-cols-4">
          {difficulties.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                difficulty === d.value
                  ? "border-[var(--primary)] bg-[var(--primary-glow)]"
                  : "border-[var(--card-border)] hover:border-[var(--primary)]/30"
              }`}
            >
              <p className="font-medium text-sm">{d.label}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="btn-shine w-full py-3.5 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Starting Interview...
          </>
        ) : (
          <>
            Start Mock Interview
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}
