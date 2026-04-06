"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import VoiceRecorder from "@/components/voice/VoiceRecorder";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  Mic,
  Type,
  Trophy,
  Target,
  BookOpen,
} from "lucide-react";

interface Question {
  id: number;
  question: string;
}

interface QuizFeedback {
  per_question: {
    question_id: number;
    feedback: string;
    ideal_answer: string;
    score: number;
  }[];
  overall_summary: string;
  strong_areas: string[];
  gaps: string[];
  topics_to_revisit: string[];
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const quizId = params.quizId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [inputMode, setInputMode] = useState<Record<number, "text" | "voice">>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const quiz = await api.getQuiz(sessionId, quizId);
        setQuestions(quiz.questions);
        if (quiz.feedback) {
          setFeedback(quiz.feedback);
          const restored: Record<number, string> = {};
          quiz.answers.forEach((a: { question_id: number; answer: string }) => {
            restored[a.question_id] = a.answer;
          });
          setAnswers(restored);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, quizId]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const q = questions[currentIndex];
      setAnswers((prev) => ({ ...prev, [q.id]: text }));
    },
    [questions, currentIndex]
  );

  const getInputMode = (qId: number) => inputMode[qId] || "text";

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const answerList = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] || "",
      }));
      const result = await api.submitQuiz(sessionId, quizId, answerList);
      setFeedback(result.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
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

  // ==================== FEEDBACK VIEW ====================
  if (feedback) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-4xl mx-auto px-5 py-8 md:py-10 space-y-7">
          <div className="animate-fade-in">
            <button
              onClick={() => router.push(`/sessions/${sessionId}/prepare`)}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
            >
              <ArrowLeft size={12} /> Back to Prepare
            </button>
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-semibold mb-2">
              Results
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold" style={{ fontFamily: "'Syne', sans-serif" }}>
              Quiz Results
            </h1>
          </div>

          {/* Overall summary */}
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 space-y-5 animate-fade-in-up delay-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary-glow)] flex items-center justify-center">
                <Trophy size={20} className="text-[var(--primary)]" />
              </div>
              <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                Overall Summary
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{feedback.overall_summary}</p>

            <div className="grid gap-5 sm:grid-cols-2 pt-2">
              <div>
                <h3 className="font-semibold text-[var(--success)] text-xs tracking-wide uppercase mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Strong Areas
                </h3>
                <ul className="space-y-2">
                  {feedback.strong_areas.map((a, i) => (
                    <li key={i} className="text-sm flex items-start gap-2 text-[var(--muted)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] mt-1.5 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-amber-400 text-xs tracking-wide uppercase mb-3 flex items-center gap-1.5">
                  <Target size={13} /> Gaps to Address
                </h3>
                <ul className="space-y-2">
                  {feedback.gaps.map((g, i) => (
                    <li key={i} className="text-sm flex items-start gap-2 text-[var(--muted)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {feedback.topics_to_revisit.length > 0 && (
              <div className="pt-3 border-t border-[var(--card-border)]">
                <h3 className="font-semibold text-xs tracking-wide uppercase text-[var(--muted)] mb-3 flex items-center gap-1.5">
                  <BookOpen size={13} /> Topics to Revisit
                </h3>
                <div className="flex flex-wrap gap-2">
                  {feedback.topics_to_revisit.map((t, i) => (
                    <span key={i} className="tag-accent px-3 py-1.5 text-xs rounded-lg font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Per-question feedback */}
          <div className="space-y-4 animate-fade-in-up delay-2">
            <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
              Question-by-Question
            </h2>
            {feedback.per_question.map((pf, i) => (
              <div key={i} className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-sm leading-relaxed">
                    <span className="text-[var(--primary)] font-bold">Q{i + 1}:</span>{" "}
                    {questions[i]?.question}
                  </h3>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                    pf.score >= 7 ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : pf.score >= 4 ? "tag-primary" : "bg-[var(--danger)]/10 text-[var(--danger)]"
                  }`}>
                    {pf.score}/10
                  </span>
                </div>
                <div className="text-sm text-[var(--muted)] leading-relaxed bg-[var(--surface)] rounded-xl p-4">
                  <span className="text-xs font-semibold tracking-wide uppercase text-[var(--muted)] block mb-1">Your answer</span>
                  {answers[questions[i]?.id] || "No answer"}
                </div>
                <div className="text-sm text-[var(--muted)] leading-relaxed">
                  <span className="text-xs font-semibold tracking-wide uppercase text-[var(--muted)] block mb-1">Feedback</span>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] underline underline-offset-3 decoration-[var(--primary)]/30 hover:decoration-[var(--primary)] transition-colors">
                            {children}
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        ),
                      }}
                    >
                      {pf.feedback}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--card-border)] pt-4">
                  <span className="text-xs font-semibold tracking-wide uppercase text-[var(--success)] block mb-1">Ideal Answer</span>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] underline underline-offset-3 decoration-[var(--primary)]/30 hover:decoration-[var(--primary)] transition-colors">
                            {children}
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        ),
                      }}
                    >
                      {pf.ideal_answer}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ==================== QUIZ TAKING VIEW ====================
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id] || "";
  const currentMode = getInputMode(currentQuestion?.id);
  const answeredCount = questions.filter((q) => (answers[q.id] || "").trim()).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 py-8 md:py-10 space-y-7">
        <div className="animate-fade-in">
          <button
            onClick={() => router.push(`/sessions/${sessionId}/prepare`)}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft size={12} /> Back to Prepare
          </button>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-semibold mb-1">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h1 className="text-2xl font-extrabold" style={{ fontFamily: "'Syne', sans-serif" }}>
                Quiz
              </h1>
            </div>
            <span className="text-sm text-[var(--muted)]">
              {answeredCount}/{questions.length} answered
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[var(--surface)] rounded-full h-1.5 animate-fade-in delay-1">
          <div
            className="h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
              background: `linear-gradient(90deg, var(--primary), #6ee7b7)`,
            }}
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
            {error}
          </div>
        )}

        {/* Question card */}
        <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 space-y-5 animate-fade-in-up delay-1">
          <p className="text-lg font-semibold leading-relaxed" style={{ fontFamily: "'Syne', sans-serif" }}>
            {currentQuestion?.question}
          </p>

          {/* Input mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-wide uppercase text-[var(--muted)] font-semibold">
              Answer with:
            </span>
            <button
              onClick={() => setInputMode((prev) => ({ ...prev, [currentQuestion.id]: "text" }))}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentMode === "text"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary-glow)]"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Type size={12} /> Text
            </button>
            <button
              onClick={() => setInputMode((prev) => ({ ...prev, [currentQuestion.id]: "voice" }))}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentMode === "voice"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary-glow)]"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Mic size={12} /> Voice
            </button>
          </div>

          {currentMode === "text" && (
            <textarea
              value={currentAnswer}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))}
              rows={6}
              className="input-base resize-y leading-relaxed"
              placeholder="Type your answer here..."
            />
          )}

          {currentMode === "voice" && (
            <div className="space-y-4">
              <VoiceRecorder onTranscript={handleVoiceTranscript} />
              {currentAnswer && (
                <div>
                  <label className="text-xs font-semibold tracking-wide uppercase text-[var(--muted)] block mb-2">
                    Transcribed answer (editable):
                  </label>
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    rows={4}
                    className="input-base resize-y leading-relaxed"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between animate-fade-in delay-2">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="btn-ghost disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={15} /> Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="btn-shine btn-primary"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="btn-shine btn-primary"
            >
              {submitting ? (
                <><Loader2 size={15} className="animate-spin" /> Evaluating...</>
              ) : (
                "Submit Quiz"
              )}
            </button>
          )}
        </div>

        {/* Question dots */}
        {questions.length <= 10 ? (
          <div className="flex justify-center gap-2 animate-fade-in delay-3">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  i === currentIndex
                    ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary-glow)]"
                    : (answers[q.id] || "").trim()
                    ? "tag-primary"
                    : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--card-border)]"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] text-center animate-fade-in delay-3">
            Question <span className="font-bold text-[var(--foreground)]">{currentIndex + 1}</span> / {questions.length}
            {answeredCount > 0 && (
              <span className="ml-2 text-[var(--primary)] font-semibold">({answeredCount} answered)</span>
            )}
          </p>
        )}
      </main>
    </div>
  );
}
