"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

interface QuizConfigProps {
  sessionId: string;
}

export default function QuizConfig({ sessionId }: QuizConfigProps) {
  const [topics, setTopics] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      const quiz = await api.createQuiz(sessionId, {
        topics: topics.trim(),
        num_questions: numQuestions,
      });
      router.push(`/sessions/${sessionId}/quiz/${quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quiz");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3
        className="text-lg font-semibold"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        New Quiz
      </h3>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
          Topics / Focus Areas
          <span className="normal-case tracking-normal font-normal ml-1">
            (optional)
          </span>
        </label>
        <textarea
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm resize-y leading-relaxed"
          placeholder='e.g. "distributed systems, behavioral STAR questions, system design trade-offs"'
        />
        <p className="text-xs text-[var(--muted)] mt-1">
          Leave empty to auto-generate from your session context.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
          Number of Questions
        </label>
        <div className="flex gap-2">
          {[5, 10, 15].map((n) => (
            <button
              key={n}
              onClick={() => setNumQuestions(n)}
              className={`px-5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                numQuestions === n
                  ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]"
                  : "border-[var(--card-border)] hover:border-[var(--primary)]/30 text-[var(--muted)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="btn-shine w-full py-3.5 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:bg-[var(--primary-hover)] transition-all disabled:opacity-50 shadow-lg shadow-[var(--primary-glow)] flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating Questions...
          </>
        ) : (
          <>
            Start Quiz ({numQuestions} Questions)
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}
