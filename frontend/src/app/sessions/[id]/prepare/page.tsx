"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PrepSource, Session } from "@/types";
import Navbar from "@/components/Navbar";
import QuizConfig from "@/components/quiz/QuizConfig";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import {
  Loader2,
  BookOpen,
  RefreshCw,
  Brain,
  Clock,
  ArrowLeft,
  Building2,
  ListChecks,
  Code2,
  Route,
  LinkIcon,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

type MainTab = "materials" | "quiz";

interface QuizSummary {
  id: string;
  mode: string;
  feedback: { overall_summary: string } | null;
  created_at: string;
}

const SECTION_META: {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "company_snapshot", label: "Company Snapshot", icon: Building2 },
  { key: "interview_process", label: "Interview Process", icon: Route },
  { key: "technical_topics", label: "Technical Topics", icon: Code2 },
  { key: "preparation_checklist", label: "Prep Checklist", icon: ListChecks },
  { key: "resource_links", label: "Resources", icon: LinkIcon },
];

export default function PreparePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [mainTab, setMainTab] = useState<MainTab>("materials");
  const [activeSection, setActiveSection] = useState("company_snapshot");
  const [prepSource, setPrepSource] = useState<PrepSource | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showQuizConfig, setShowQuizConfig] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [sessionData, prepData, quizData] = await Promise.all([
          api.getSession(sessionId).catch(() => null),
          api.getPrepSources(sessionId).catch(() => null),
          api.listQuizzes(sessionId).catch(() => []),
        ]);
        setSession(sessionData);
        setPrepSource(prepData);
        setQuizzes(quizData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const isPrepStale =
    !!prepSource &&
    !!session?.updated_at &&
    new Date(session.updated_at).getTime() > new Date(prepSource.generated_at).getTime();

  const handleGenerateAll = async () => {
    setGenerating(true);
    setError("");
    try {
      const data = await api.generatePrepSources(sessionId);
      setPrepSource(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prep sources");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateSection = async (sectionKey: string) => {
    setRegeneratingSection(sectionKey);
    setError("");
    try {
      const result = await api.regeneratePrepSection(sessionId, sectionKey);
      setPrepSource((prev) => {
        if (!prev) return prev;
        return { ...prev, content: { ...prev.content, [sectionKey]: result.content } };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate section");
    } finally {
      setRegeneratingSection(null);
    }
  };

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

  const currentSectionContent = prepSource?.content?.[activeSection] || "";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 py-8 md:py-10 space-y-7">
        {/* Header */}
        <div className="animate-fade-in">
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft size={12} /> Back to Session
          </Link>
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-semibold mb-2">
            Study & Practice
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold" style={{ fontFamily: "'Syne', sans-serif" }}>
            Prepare
          </h1>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
            {error}
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl w-fit animate-fade-in delay-1">
          <button
            onClick={() => setMainTab("materials")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mainTab === "materials"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <BookOpen size={15} />
            Prep Materials
          </button>
          <button
            onClick={() => setMainTab("quiz")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mainTab === "quiz"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Brain size={15} />
            Quizzes
            {quizzes.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full tag-accent font-bold">
                {quizzes.length}
              </span>
            )}
          </button>
        </div>

        {/* PREP MATERIALS TAB */}
        {mainTab === "materials" && (
          <>
            {isPrepStale && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 animate-fade-in-scale">
                <AlertTriangle size={18} className="text-[var(--warning)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Session inputs changed
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Your prep materials were generated before the latest edits and may be out of date.
                  </p>
                </div>
                <button
                  onClick={handleGenerateAll}
                  disabled={generating}
                  className="btn-shine btn-primary !py-2 !px-3 !text-xs shrink-0"
                >
                  {generating ? (
                    <><Loader2 size={12} className="animate-spin" /> Regenerating...</>
                  ) : (
                    <><RefreshCw size={12} /> Regenerate All</>
                  )}
                </button>
              </div>
            )}
            {prepSource ? (
              <div className="space-y-5 animate-fade-in-up">
                {/* Section sub-tabs */}
                <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {SECTION_META.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                        activeSection === key
                          ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary-glow)]"
                          : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--card-border)] hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
                {/* Scroll fade indicator */}
                <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />
                </div>

                {/* Active section content */}
                <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {SECTION_META.find((s) => s.key === activeSection)?.label}
                    </h3>
                    <button
                      onClick={() => handleRegenerateSection(activeSection)}
                      disabled={regeneratingSection === activeSection}
                      className="btn-ghost !py-2 !px-3 !text-xs"
                    >
                      {regeneratingSection === activeSection ? (
                        <><Loader2 size={12} className="animate-spin" /> Regenerating...</>
                      ) : (
                        <><RefreshCw size={12} /> Regenerate</>
                      )}
                    </button>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    {regeneratingSection === activeSection ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-xs text-[var(--muted)]">Regenerating...</p>
                        </div>
                      </div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--primary)] underline underline-offset-3 decoration-[var(--primary)]/30 hover:decoration-[var(--primary)] transition-colors"
                            >
                              {children}
                              <ExternalLink size={12} className="shrink-0" />
                            </a>
                          ),
                        }}
                      >
                        {currentSectionContent}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateAll}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                  >
                    {generating ? (
                      <><Loader2 size={13} className="animate-spin" /> Regenerating all...</>
                    ) : (
                      <><RefreshCw size={13} /> Regenerate all sections</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in-up text-center py-20 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary-glow)] flex items-center justify-center mx-auto mb-5">
                  <Sparkles size={28} className="text-[var(--primary)]" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Generate your prep materials
                </h2>
                <p className="text-[var(--muted)] text-sm mb-6 max-w-sm mx-auto">
                  AI-powered research tailored to your target role and company.
                </p>
                <button
                  onClick={handleGenerateAll}
                  disabled={generating}
                  className="btn-shine btn-primary"
                >
                  {generating ? (
                    <><Loader2 size={15} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={15} /> Generate Prep Sources</>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* QUIZZES TAB */}
        {mainTab === "quiz" && (
          <section className="space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowQuizConfig(!showQuizConfig)}
                className={showQuizConfig ? "btn-ghost" : "btn-shine btn-primary"}
              >
                {showQuizConfig ? "Cancel" : "New Quiz"}
              </button>
            </div>

            {showQuizConfig && (
              <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 animate-fade-in-scale">
                <QuizConfig sessionId={sessionId} />
              </div>
            )}

            {quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.map((quiz, i) => (
                  <Link
                    key={quiz.id}
                    href={`/sessions/${sessionId}/quiz/${quiz.id}`}
                    className={`gradient-border block bg-[var(--card)] rounded-2xl p-5 animate-fade-in-up delay-${Math.min(i + 1, 6)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
                          <Brain size={16} className="text-[var(--accent)]" />
                        </div>
                        <div>
                          <span className="font-semibold capitalize text-sm">
                            {quiz.mode} Quiz
                          </span>
                          <span className="text-xs text-[var(--muted)] ml-2 inline-flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(quiz.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                          quiz.feedback
                            ? "bg-[var(--success)]/10 text-[var(--success)]"
                            : "tag-primary"
                        }`}
                      >
                        {quiz.feedback ? "Completed" : "In Progress"}
                      </span>
                    </div>
                    {quiz.feedback && (
                      <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2 pl-12 leading-relaxed">
                        {quiz.feedback.overall_summary}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : !showQuizConfig ? (
              <div className="text-center py-20 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-4">
                  <Brain size={24} className="text-[var(--accent)]" />
                </div>
                <h3 className="font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                  No quizzes yet
                </h3>
                <p className="text-[var(--muted)] text-sm">
                  Start a new quiz to test your knowledge.
                </p>
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}
