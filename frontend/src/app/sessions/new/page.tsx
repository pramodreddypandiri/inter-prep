"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  FileText,
  Mic,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  { label: "Basics", icon: Building2 },
  { label: "Job Details", icon: FileText },
  { label: "Round Info", icon: Mic },
  { label: "Resume", icon: Upload },
];

export default function NewSessionPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jdText, setJdText] = useState("");
  const [roundDescription, setRoundDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const canProceed = () => {
    if (step === 0) return name.trim() && companyName.trim();
    if (step === 1) return jdText.trim();
    if (step === 2) return roundDescription.trim();
    return true; // resume is optional
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let resumeText = "";
      if (resumeFile) {
        const result = await api.uploadResume(resumeFile);
        resumeText = result.text;
      }

      const session = await api.createSession({
        name,
        company_name: companyName,
        jd_text: jdText,
        resume_text: resumeText,
        round_description: roundDescription,
      });

      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create session"
      );
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-5 py-8 md:py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-semibold mb-2">
            New Session
          </p>
          <h1
            className="text-2xl md:text-3xl font-extrabold"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Set up your interview
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1.5">
            Provide details about the role and we&apos;ll generate personalized prep materials.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 animate-fade-in delay-1">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;
            return (
              <div key={s.label} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? "step-active"
                      : isComplete
                      ? "step-complete"
                      : "step-inactive"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <StepIcon size={16} />
                  )}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 transition-colors ${
                      i < step ? "bg-[var(--success)]" : "bg-[var(--card-border)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step label */}
        <div className="mb-6 animate-fade-in delay-1">
          <p className="text-sm font-semibold">
            Step {step + 1}: {STEPS[step].label}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-5 animate-fade-in-up">
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                  Session Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base"
                  placeholder='e.g. "Stripe Staff Eng"'
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="company" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                  Company Name
                </label>
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input-base"
                  placeholder="e.g. Stripe"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-1.5">
              <label htmlFor="jd" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                Job Description
              </label>
              <textarea
                id="jd"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={10}
                className="input-base resize-y leading-relaxed"
                placeholder="Paste the full job description here..."
                autoFocus
              />
              <p className="text-[10px] text-[var(--muted)]">
                Tip: The more detail you paste, the better your prep materials will be.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-1.5">
              <label htmlFor="round" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                Round Description
              </label>
              <textarea
                id="round"
                value={roundDescription}
                onChange={(e) => setRoundDescription(e.target.value)}
                rows={4}
                className="input-base resize-y leading-relaxed"
                placeholder='e.g. "System design + behavioral + some DSA"'
                autoFocus
              />
              <p className="text-[10px] text-[var(--muted)]">
                Describe the interview format so we can tailor your prep.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-1.5">
              <label htmlFor="resume" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                Resume Upload <span className="text-[var(--muted)]/60">(optional)</span>
              </label>
              <label
                htmlFor="resume"
                className="flex items-center gap-4 px-5 py-5 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--primary)] hover:bg-[var(--card-hover)] transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-glow)] to-[var(--primary-glow)] flex items-center justify-center group-hover:from-[var(--primary)]/20 group-hover:to-[var(--primary)]/20 transition-all">
                  <Upload size={20} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {resumeFile ? resumeFile.name : "Choose a file"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    PDF, DOCX, TXT, or image formats
                  </p>
                </div>
                {resumeFile && (
                  <CheckCircle2 size={18} className="text-[var(--success)]" />
                )}
              </label>
              <input
                id="resume"
                type="file"
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <p className="text-[10px] text-[var(--muted)]">
                Uploading your resume helps us generate more targeted prep materials.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--card-border)]">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={!canProceed() || loading}
            className="btn-shine btn-primary"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Creating...
              </>
            ) : step < 3 ? (
              <>
                Continue
                <ArrowRight size={15} />
              </>
            ) : (
              <>
                Create Session
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
