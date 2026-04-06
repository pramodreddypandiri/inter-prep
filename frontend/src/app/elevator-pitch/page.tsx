"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { ElevatorPitch } from "@/types";
import {
  Mic,
  Plus,
  Sparkles,
  ChevronRight,
  Briefcase,
  Clock,
  Trash2,
  Star,
} from "lucide-react";

type Step = "form" | "preview";

export default function ElevatorPitchPage() {
  const router = useRouter();
  const [pitches, setPitches] = useState<ElevatorPitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [step, setStep] = useState<Step>("form");
  const [targetRole, setTargetRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [keyStrengths, setKeyStrengths] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listPitches()
      .then(setPitches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    if (!targetRole.trim()) {
      setError("Target role is required.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const { pitch_text } = await api.generatePitch({
        target_role: targetRole,
        company_name: companyName,
        resume_text: resumeText,
        key_strengths: keyStrengths,
      });
      setGeneratedText(pitch_text);
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate pitch");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedText.trim()) return;
    setSaving(true);
    try {
      const pitch = await api.createPitch({
        pitch_text: generatedText,
        target_role: targetRole,
        company_name: companyName,
        resume_text: resumeText,
      });
      router.push(`/elevator-pitch/${pitch.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save pitch");
      setSaving(false);
    }
  }

  async function handleDelete(pitchId: string) {
    if (!confirm("Delete this pitch and all its recordings?")) return;
    await api.deletePitch(pitchId).catch(console.error);
    setPitches((prev) => prev.filter((p) => p.id !== pitchId));
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 py-8 md:py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1
                className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                <Mic size={26} className="text-[var(--primary)]" />
                Elevator Pitch
              </h1>
              <p className="text-[var(--muted)] text-sm mt-1">
                Generate, practice, and share your 60-second elevator pitch
              </p>
            </div>
            {!showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="btn-shine btn-primary shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} />
                New Pitch
              </button>
            )}
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-8 gradient-border bg-[var(--card)] rounded-2xl p-6 animate-fade-in-up">
            {step === "form" ? (
              <>
                <h2
                  className="font-bold text-lg mb-5"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  Generate Your Pitch
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Target Role <span className="text-[var(--danger)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Software Engineer, Product Manager"
                      className="input-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Company (optional)
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Google, Stripe"
                      className="input-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Key Strengths to Highlight (optional)
                    </label>
                    <textarea
                      value={keyStrengths}
                      onChange={(e) => setKeyStrengths(e.target.value)}
                      rows={2}
                      placeholder="e.g. 5 years backend experience, led 10-person team, shipped ML product..."
                      className="input-base resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Resume / Background (optional — paste for better tailoring)
                    </label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      rows={4}
                      placeholder="Paste resume text or relevant experience..."
                      className="input-base resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-[var(--danger)]">{error}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="btn-shine btn-primary flex-1"
                    >
                      {generating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          Generate with AI
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setStep("form");
                        setError("");
                      }}
                      className="btn-secondary px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="font-bold text-lg"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    Your Pitch
                  </h2>
                  <span className="text-xs text-[var(--muted)] bg-[var(--card-border)] px-2.5 py-1 rounded-lg">
                    ~{Math.round((generatedText.split(" ").length / 130) * 60)}s estimated
                  </span>
                </div>

                <textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  rows={8}
                  className="input-base resize-none leading-relaxed"
                />

                <p className="text-xs text-[var(--muted)] mt-2">
                  Edit the text above to personalise it before saving.
                </p>

                {error && (
                  <p className="text-sm text-[var(--danger)] mt-2">{error}</p>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-shine btn-primary flex-1"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save & Practice"
                    )}
                  </button>
                  <button
                    onClick={() => setStep("form")}
                    className="btn-secondary px-4"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pitches list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pitches.length === 0 && !showCreate ? (
          <div className="text-center py-20 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)] animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary-glow)] flex items-center justify-center mx-auto mb-5">
              <Mic size={28} className="text-[var(--primary)]" />
            </div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              No pitches yet
            </h2>
            <p className="text-[var(--muted)] text-sm mb-6 max-w-sm mx-auto">
              Generate an AI-crafted elevator pitch tailored to your target role,
              practice it on video, and share your best take.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-shine btn-primary"
            >
              <Plus size={16} />
              Create Your First Pitch
            </button>
          </div>
        ) : pitches.length > 0 ? (
          <div className="space-y-3 animate-fade-in-up">
            <h2
              className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3"
            >
              Saved Pitches
            </h2>
            {pitches.map((pitch) => (
              <div
                key={pitch.id}
                className="gradient-border bg-[var(--card)] rounded-2xl p-5 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/elevator-pitch/${pitch.id}`}
                    className="flex-1 flex items-center gap-3 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary-glow)] flex items-center justify-center shrink-0">
                      <Mic size={18} className="text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="font-bold text-sm truncate group-hover:text-[var(--primary)] transition-colors"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        {pitch.target_role}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {pitch.company_name && (
                          <span className="tag-primary px-2 py-0.5 text-xs rounded-md flex items-center gap-1">
                            <Briefcase size={10} />
                            {pitch.company_name}
                          </span>
                        )}
                        <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(pitch.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/elevator-pitch/${pitch.id}`}
                      className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline"
                    >
                      Practice
                      <ChevronRight size={12} />
                    </Link>
                    <button
                      onClick={() => handleDelete(pitch.id)}
                      aria-label={`Delete pitch for ${pitch.target_role}`}
                      className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors p-1"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Info card — scoring criteria */}
        <div className="mt-10 border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5 animate-fade-in-up">
          <h3
            className="font-bold text-sm mb-3 flex items-center gap-2"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            <Star size={14} className="text-[var(--accent)]" />
            How pitches are scored (100 pts)
          </h3>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-[var(--muted)]">
            {[
              ["Opening Hook", "15"],
              ["Identity Clarity", "15"],
              ["Value Proposition", "20"],
              ["Unique Differentiator", "20"],
              ["Role Fit", "15"],
              ["Call to Action", "10"],
              ["Delivery & Timing", "5"],
            ].map(([label, pts]) => (
              <li key={label} className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <span className="font-semibold text-[var(--foreground)]">{pts} pts</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
