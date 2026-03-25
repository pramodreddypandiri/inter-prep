"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Upload, ArrowRight, Loader2 } from "lucide-react";

export default function NewSessionPage() {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jdText, setJdText] = useState("");
  const [roundDescription, setRoundDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let resumeText = "";

      if (resumeFile) {
        const result = await api.uploadResume(resumeFile, user.id);
        resumeText = result.text;
      }

      const session = await api.createSession({
        name,
        company_name: companyName,
        jd_text: jdText,
        resume_text: resumeText,
        round_description: roundDescription,
        user_id: user.id,
      });

      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create session"
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-medium mb-2">
            New Session
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Set up your interview
          </h1>
          <p className="text-[var(--muted)] text-sm mt-2">
            Provide details about the role and we&apos;ll generate personalized
            prep materials.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 animate-fade-in-up delay-1"
        >
          {error && (
            <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
              {error}
            </div>
          )}

          {/* Two-column row */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]"
              >
                Session Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm"
                placeholder='e.g. "Stripe Staff Eng"'
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="company"
                className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]"
              >
                Company Name
              </label>
              <input
                id="company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm"
                placeholder="e.g. Stripe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="jd"
              className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]"
            >
              Job Description
            </label>
            <textarea
              id="jd"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              required
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm resize-y leading-relaxed"
              placeholder="Paste the full job description here..."
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="round"
              className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]"
            >
              Round Description
            </label>
            <textarea
              id="round"
              value={roundDescription}
              onChange={(e) => setRoundDescription(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm resize-y leading-relaxed"
              placeholder='e.g. "system design + behavioral + some DSA"'
            />
          </div>

          {/* Resume Upload */}
          <div className="space-y-1.5">
            <label
              htmlFor="resume"
              className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]"
            >
              Resume Upload
            </label>
            <label
              htmlFor="resume"
              className="flex items-center gap-3 px-5 py-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--primary)] hover:bg-[var(--card-hover)] transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--primary-glow)] flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                <Upload
                  size={18}
                  className="text-[var(--primary)]"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {resumeFile ? resumeFile.name : "Choose a file"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  PDF, DOCX, TXT, or image formats
                </p>
              </div>
            </label>
            <input
              id="resume"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-shine w-full py-3.5 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:bg-[var(--primary-hover)] transition-all disabled:opacity-50 shadow-lg shadow-[var(--primary-glow)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                Create Session
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
