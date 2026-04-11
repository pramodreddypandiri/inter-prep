"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Session } from "@/types";
import {
  X,
  Loader2,
  Upload,
  CheckCircle2,
  Building2,
  FileText,
  Mic,
  FileUp,
} from "lucide-react";

interface Props {
  session: Session;
  onClose: () => void;
  onSaved: (updated: Session) => void;
}

export default function EditSessionModal({ session, onClose, onSaved }: Props) {
  const [name, setName] = useState(session.name);
  const [companyName, setCompanyName] = useState(session.company_name);
  const [jdText, setJdText] = useState(session.jd_text);
  const [roundDescription, setRoundDescription] = useState(session.round_description);
  const [resumeText, setResumeText] = useState(session.resume_text);
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleFilePick = async (file: File) => {
    setError("");
    setNewResumeFile(file);
    setUploadingResume(true);
    try {
      const result = await api.uploadResume(file);
      setResumeText(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume");
      setNewResumeFile(null);
    } finally {
      setUploadingResume(false);
    }
  };

  const diff = () => {
    const payload: Partial<{
      name: string;
      company_name: string;
      jd_text: string;
      resume_text: string;
      round_description: string;
    }> = {};
    if (name.trim() !== session.name) payload.name = name.trim();
    if (companyName.trim() !== session.company_name) payload.company_name = companyName.trim();
    if (jdText.trim() !== session.jd_text) payload.jd_text = jdText.trim();
    if (roundDescription.trim() !== session.round_description) payload.round_description = roundDescription.trim();
    if (resumeText !== session.resume_text) payload.resume_text = resumeText;
    return payload;
  };

  const handleSave = async () => {
    setError("");
    const payload = diff();
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    if (!name.trim() || !companyName.trim() || !jdText.trim() || !roundDescription.trim()) {
      setError("Name, company, job description, and round description are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateSession(session.id, payload);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-title"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl animate-fade-in-scale"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[var(--card)] border-b border-[var(--card-border)]">
          <h2
            id="edit-session-title"
            className="text-xl font-extrabold"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Edit Session
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
              {error}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="edit-name" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                Session Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-company" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                Company Name
              </label>
              <input
                id="edit-company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-jd" className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
              <FileText size={12} /> Job Description
            </label>
            <textarea
              id="edit-jd"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={8}
              className="input-base resize-y leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-round" className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
              <Mic size={12} /> Round Description
            </label>
            <textarea
              id="edit-round"
              value={roundDescription}
              onChange={(e) => setRoundDescription(e.target.value)}
              rows={4}
              className="input-base resize-y leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
              <FileUp size={12} /> Resume
            </label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface)]">
              <Building2 size={18} className="text-[var(--muted)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {newResumeFile
                    ? newResumeFile.name
                    : resumeText
                    ? `${resumeText.length.toLocaleString()} characters parsed`
                    : "No resume uploaded"}
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  Re-upload to replace the current resume text.
                </p>
              </div>
              {uploadingResume ? (
                <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
              ) : newResumeFile ? (
                <CheckCircle2 size={16} className="text-[var(--success)]" />
              ) : null}
              <label
                htmlFor="edit-resume-file"
                className="btn-ghost !py-1.5 !px-3 !text-xs cursor-pointer shrink-0"
              >
                <Upload size={12} />
                Re-upload
              </label>
              <input
                id="edit-resume-file"
                type="file"
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFilePick(f);
                }}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 bg-[var(--card)] border-t border-[var(--card-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingResume}
            className="btn-shine btn-primary"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
