"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Mail, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

export default function ContactPage() {
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
          email: authUser.email || "",
        });
      }
    };
    loadUser();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be under 5MB");
      return;
    }
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please sign in to send a message.");
      return;
    }
    setSending(true);
    setError("");

    try {
      await api.submitContact({
        user_name: user.name,
        user_email: user.email,
        type,
        message,
        screenshot: screenshot || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(90deg, var(--card-border) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <div className="mb-10">
          <h1
            className="text-4xl font-bold tracking-tight mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Get in <span className="text-[var(--primary)]">touch</span>
          </h1>
          <p className="text-[var(--muted)] text-lg">
            Have feedback, found a bug, or need help? We&apos;d love to hear from you.
          </p>
          {user && (
            <p className="text-sm text-[var(--muted)] mt-2">
              Sending as <span className="text-[var(--foreground)]">{user.name}</span> ({user.email})
            </p>
          )}
        </div>

        {submitted ? (
          <div className="card p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Send size={20} className="text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">Message sent!</h2>
            <p className="text-[var(--muted)]">
              Thank you for reaching out. We&apos;ll get back to you soon.
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-all"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                  setType("feedback");
                  removeScreenshot();
                }}
                className="px-6 py-2.5 border border-[var(--card-border)] rounded-lg text-sm font-medium hover:bg-[var(--surface)] transition-all"
              >
                Send Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">What can we help with?</label>
              <div className="flex gap-3">
                {[
                  { value: "feedback", label: "Feedback" },
                  { value: "bug", label: "Bug Report" },
                  { value: "support", label: "Support" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                      type === opt.value
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--primary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Screenshot (optional)</label>
              {preview ? (
                <div className="relative inline-block">
                  <img
                    src={preview}
                    alt="Screenshot preview"
                    className="max-h-48 rounded-lg border border-[var(--card-border)]"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <p className="text-xs text-[var(--muted)] mt-1">{screenshot?.name}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 border border-dashed border-[var(--card-border)] rounded-lg text-sm text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition-all w-full justify-center"
                >
                  <ImagePlus size={18} />
                  Click to upload a screenshot
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending || !user}
              className="btn-shine flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary-glow)] disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}

        {/* Alternative contact */}
        <div className="mt-12 pt-8 border-t border-[var(--card-border)]">
          <p className="text-sm text-[var(--muted)] mb-4">You can also reach us through:</p>
          <div className="flex gap-4">
            <a
              href="https://github.com/pramodreddypandiri/inter-prep/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 border border-[var(--card-border)] rounded-lg text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub Issues
            </a>
            <a
              href="mailto:pramodreddypandiri010@gmail.com"
              className="flex items-center gap-2 px-4 py-2.5 border border-[var(--card-border)] rounded-lg text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all"
            >
              <Mail size={16} />
              Email Directly
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
