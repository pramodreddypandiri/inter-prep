"use client";

import { useState } from "react";
import { Send, Loader2, Check, AlertCircle, Users } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SendResult {
  sent: number;
  failed: number;
  total_users: number;
}

export default function AdminNewsletterPage() {
  const [adminKey, setAdminKey] = useState("");
  const [subject, setSubject] = useState("");
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [ctaText, setCtaText] = useState("Try it now");
  const [ctaUrl, setCtaUrl] = useState("");

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    setSending(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/send-newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          subject,
          feature_title: featureTitle,
          feature_description: featureDescription,
          cta_text: ctaText,
          cta_url: ctaUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Error ${res.status}`);
      }

      const data: SendResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  const canSend =
    adminKey.trim() &&
    subject.trim() &&
    featureTitle.trim() &&
    featureDescription.trim() &&
    !sending;

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-start justify-center py-16 px-5">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-[var(--primary)] uppercase tracking-widest font-semibold mb-2">
            Admin
          </p>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Send Feature Newsletter
          </h1>
          <p className="text-sm text-[var(--muted)] mt-2">
            Composes and sends a branded email to every registered user.
          </p>
        </div>

        <form onSubmit={handleSend} className="space-y-5">
          {/* Admin key */}
          <div className="gradient-border bg-[var(--card)] rounded-2xl p-5 space-y-4">
            <h2
              className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Authentication
            </h2>
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Admin Key
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Your ADMIN_SECRET value"
                required
                className="input-base w-full text-sm"
              />
            </div>
          </div>

          {/* Email content */}
          <div className="gradient-border bg-[var(--card)] rounded-2xl p-5 space-y-4">
            <h2
              className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Email Content
            </h2>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Subject line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. New on InterviewAce: Elevator Pitch Practice"
                required
                className="input-base w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Feature title
              </label>
              <input
                type="text"
                value={featureTitle}
                onChange={(e) => setFeatureTitle(e.target.value)}
                placeholder="e.g. Practice Your Elevator Pitch with AI Scoring"
                required
                className="input-base w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Description
              </label>
              <textarea
                value={featureDescription}
                onChange={(e) => setFeatureDescription(e.target.value)}
                placeholder="A few sentences describing the new feature and why users will love it."
                required
                rows={5}
                className="input-base w-full text-sm resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* CTA */}
          <div className="gradient-border bg-[var(--card)] rounded-2xl p-5 space-y-4">
            <h2
              className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Call to Action
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Button text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Try it now"
                  className="input-base w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Button URL{" "}
                  <span className="text-[var(--muted)] font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="Defaults to app home"
                  className="input-base w-full text-sm"
                />
              </div>
            </div>
          </div>

          {/* Result / Error */}
          {result && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 px-4 py-3">
              <Check size={16} className="text-[var(--success)] mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-[var(--success)]">Newsletter sent</p>
                <p className="text-[var(--muted)] mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} />
                    {result.sent} sent
                    {result.failed > 0 && `, ${result.failed} failed`}
                    {" "}· {result.total_users} total users
                  </span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3">
              <AlertCircle size={16} className="text-[var(--danger)] mt-0.5 shrink-0" />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSend}
            className="btn-shine btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send size={16} />
                Send to All Users
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
