"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import MockConfig from "@/components/mock/MockConfig";
import Link from "next/link";
import { MessageSquare, Clock, ArrowLeft, Star } from "lucide-react";

interface MockSummary {
  id: string;
  topics: string;
  duration: number;
  difficulty: string;
  feedback_report: { overall_rating: string } | null;
  created_at: string;
}

export default function MockInterviewsPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [mocks, setMocks] = useState<MockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.listMockInterviews(sessionId);
        setMocks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 py-8 md:py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft size={12} /> Back to Session
          </Link>
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-semibold mb-2">
            Practice
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold" style={{ fontFamily: "'Syne', sans-serif" }}>
            Mock Interviews
          </h1>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
            {error}
          </div>
        )}

        {/* New Mock Interview */}
        <section className="space-y-4 animate-fade-in-up delay-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
              Start a New Interview
            </h2>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={showConfig ? "btn-ghost" : "btn-shine btn-primary"}
            >
              {showConfig ? "Cancel" : "New Mock Interview"}
            </button>
          </div>

          {showConfig && (
            <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 animate-fade-in-scale">
              <MockConfig sessionId={sessionId} />
            </div>
          )}
        </section>

        {/* Past Interviews */}
        <section className="space-y-4 animate-fade-in-up delay-2">
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
            Past Interviews
          </h2>

          {mocks.length > 0 ? (
            <div className="space-y-3">
              {mocks.map((mock, i) => (
                <Link
                  key={mock.id}
                  href={`/sessions/${sessionId}/mock/${mock.id}`}
                  className={`gradient-border block bg-[var(--card)] rounded-2xl p-5 animate-fade-in-up delay-${Math.min(i + 1, 6)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
                        <MessageSquare size={16} className="text-[var(--accent)]" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm">{mock.topics}</span>
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                          <span>{mock.duration}min</span>
                          <span className="w-1 h-1 rounded-full bg-[var(--card-border)]" />
                          <span className="capitalize">{mock.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                        mock.feedback_report
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : "tag-primary"
                      }`}
                    >
                      {mock.feedback_report ? "Reviewed" : "In Progress"}
                    </span>
                  </div>
                  {mock.feedback_report && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--muted)] mt-3 pl-12">
                      <Star size={12} className="text-[var(--primary)]" />
                      Rating: {mock.feedback_report.overall_rating}
                    </div>
                  )}
                  <p className="text-xs text-[var(--muted)] mt-2 pl-12 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(mock.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-[var(--accent)]" />
              </div>
              <h3 className="font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                No interviews yet
              </h3>
              <p className="text-[var(--muted)] text-sm">
                Start a mock interview to practice your skills.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
