"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { ElevatorPitch, PitchFeedback, PitchRecording } from "@/types";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Square,
  Play,
  Pause,
  Share2,
  Copy,
  Check,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";

const RECORD_DURATION = 60; // seconds

// ── helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "var(--muted)";
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--accent)";
  if (score >= 40) return "#f59e0b";
  return "var(--danger)";
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number | null }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? score / 100 : 0;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92">
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--card-border)" strokeWidth="6" />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 46 46)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="46"
        y="50"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill={scoreColor(score)}
        fontFamily="'Syne', sans-serif"
      >
        {score !== null ? score : "—"}
      </text>
    </svg>
  );
}

function DimensionBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--muted)]">{label}</span>
        <span className="text-xs font-semibold">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              pct >= 75
                ? "var(--success)"
                : pct >= 50
                ? "var(--accent)"
                : "var(--danger)",
          }}
        />
      </div>
    </div>
  );
}

function FeedbackPanel({ feedback }: { feedback: PitchFeedback }) {
  const [expanded, setExpanded] = useState(false);
  const dims = feedback.dimensions;

  return (
    <div className="space-y-5">
      {/* Score + dimensions */}
      <div className="flex gap-6 items-start">
        <div className="shrink-0">
          <ScoreRing score={feedback.overall_score} />
          <p className="text-xs text-center text-[var(--muted)] mt-1">Score</p>
        </div>
        <div className="flex-1 space-y-2">
          <DimensionBar label="Opening Hook" value={dims.opening_hook} max={15} />
          <DimensionBar label="Identity Clarity" value={dims.identity_clarity} max={15} />
          <DimensionBar label="Value Proposition" value={dims.value_proposition} max={20} />
          <DimensionBar label="Unique Differentiator" value={dims.unique_differentiator} max={20} />
          <DimensionBar label="Role Fit" value={dims.role_fit} max={15} />
          <DimensionBar label="Call to Action" value={dims.call_to_action} max={10} />
          <DimensionBar label="Delivery" value={dims.delivery} max={5} />
        </div>
      </div>

      {/* Timing note */}
      {feedback.timing_note && (
        <p className="text-xs text-[var(--muted)] italic border-l-2 border-[var(--card-border)] pl-3">
          {feedback.timing_note}
        </p>
      )}

      {/* Toggle details */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? "Hide" : "Show"} detailed feedback
      </button>

      {expanded && (
        <div className="space-y-4 animate-fade-in">
          {feedback.strengths?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--success)] mb-2 uppercase tracking-wide">
                Strengths
              </p>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--success)] mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.improvements?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--danger)] mb-2 uppercase tracking-wide">
                Improvements
              </p>
              <ul className="space-y-1">
                {feedback.improvements.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--danger)] mt-0.5">↑</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.tailored_suggestions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--accent)] mb-2 uppercase tracking-wide">
                Role-specific suggestions
              </p>
              <ul className="space-y-1">
                {feedback.tailored_suggestions.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--accent)] mt-0.5">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecordingRow({ recording }: { recording: PitchRecording }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/pitch/${recording.share_token}`
      : "";

  async function copyShare() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  }

  return (
    <div className="border border-[var(--card-border)] bg-[var(--background)] rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Score badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
            style={{
              background: `color-mix(in srgb, ${scoreColor(recording.score)} 15%, transparent)`,
              color: scoreColor(recording.score),
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {recording.score ?? "—"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold">
              {new Date(recording.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                <Clock size={10} />
                {formatDuration(recording.duration_seconds)}
              </span>
              {recording.video_url && (
                <span className="text-xs text-[var(--success)]">● video</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            Feedback
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={copyShare}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="Copy share link"
          >
            {copied ? <Check size={13} className="text-[var(--success)]" /> : <Share2 size={13} />}
            Share
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-[var(--card-border)] pt-4 animate-fade-in">
          {/* Video player */}
          {recording.video_url && (
            <div className="rounded-xl overflow-hidden bg-black relative">
              <video
                ref={videoRef}
                src={recording.video_url}
                className="w-full max-h-56 object-contain"
                onEnded={() => setPlaying(false)}
                controls
              />
            </div>
          )}

          {/* Transcript */}
          {recording.transcript && (
            <div>
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
                Transcript
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted)] italic">
                "{recording.transcript}"
              </p>
            </div>
          )}

          {/* Feedback */}
          {recording.feedback && (
            <FeedbackPanel feedback={recording.feedback as PitchFeedback} />
          )}
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

type RecordState = "idle" | "countdown" | "recording" | "stopped" | "analyzing";

export default function PitchDetailPage() {
  const { pitchId } = useParams<{ pitchId: string }>();
  const router = useRouter();

  const [pitch, setPitch] = useState<ElevatorPitch | null>(null);
  const [loadingPitch, setLoadingPitch] = useState(true);

  // Editor state
  const [editedText, setEditedText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [scriptHidden, setScriptHidden] = useState(false);

  // Recorder state
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [countdown, setCountdown] = useState(RECORD_DURATION);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    api
      .getPitch(pitchId)
      .then((p: ElevatorPitch) => {
        setPitch(p);
        setEditedText(p.pitch_text);
      })
      .catch(() => router.push("/elevator-pitch"))
      .finally(() => setLoadingPitch(false));
  }, [pitchId, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopEverything() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  }

  const startRecording = useCallback(async () => {
    setTranscript("");
    setInterimTranscript("");
    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      alert("Camera/microphone permission is required to record a pitch.");
      return;
    }
    streamRef.current = stream;

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.play().catch(() => {});
    }

    // MediaRecorder setup
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    };
    recorder.start(100);

    // Speech recognition
    type SpeechRecognitionCtor = new () => SpeechRecognition;
    const SpeechRecognitionAPI: SpeechRecognitionCtor | undefined =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      const recog = new SpeechRecognitionAPI();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";

      recog.onresult = (event) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) {
            final += r[0].transcript + " ";
          } else {
            interim += r[0].transcript;
          }
        }
        setTranscript(final);
        setInterimTranscript(interim);
      };
      recog.onerror = () => {};
      recog.start();
      recognitionRef.current = recog;
    }

    // Countdown timer
    setCountdown(RECORD_DURATION);
    setRecordState("recording");

    let remaining = RECORD_DURATION;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        stopRecording();
      }
    }, 1000);
  }, [previewUrl]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setRecordState("stopped");
  }, []);

  async function handleAnalyze() {
    setRecordState("analyzing");
    const finalTranscript = transcript.trim();
    const elapsed = RECORD_DURATION - countdown;
    try {
      const recording = await api.createRecording(pitchId, {
        transcript: finalTranscript,
        duration_seconds: elapsed > 0 ? elapsed : RECORD_DURATION,
        video: recordedBlob ?? undefined,
      });
      // Prepend to recordings list
      setPitch((prev) =>
        prev
          ? { ...prev, recordings: [recording, ...(prev.recordings ?? [])] }
          : prev
      );
      setRecordState("idle");
      setTranscript("");
      setRecordedBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to analyze recording");
      setRecordState("stopped");
    }
  }

  async function handleSavePitch() {
    if (!pitch) return;
    setSaving(true);
    try {
      await api.updatePitch(pitchId, { pitch_text: editedText });
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const wordCount = editedText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSecs = Math.round((wordCount / 130) * 60);

  if (loadingPitch) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!pitch) return null;

  const isRecording = recordState === "recording";
  const isStopped = recordState === "stopped";
  const isAnalyzing = recordState === "analyzing";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 py-8 md:py-10">
        {/* Back */}
        <Link
          href="/elevator-pitch"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          All Pitches
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {pitch.target_role}
            {pitch.company_name && (
              <span className="text-[var(--primary)]"> @ {pitch.company_name}</span>
            )}
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Left: Pitch editor ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="gradient-border bg-[var(--card)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="font-bold text-base"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  Pitch Script
                </h2>
                <div className="flex items-center gap-3">
                  {!scriptHidden && (
                    <span className="text-xs text-[var(--muted)]">
                      ~{estimatedSecs}s · {wordCount} words
                    </span>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer select-none" title={scriptHidden ? "Show script" : "Hide script"}>
                    <span className="text-xs text-[var(--muted)]">Hide</span>
                    <span
                      onClick={() => setScriptHidden((p) => !p)}
                      className="relative inline-flex items-center w-9 h-5 rounded-full transition-colors duration-200"
                      style={{ background: scriptHidden ? "var(--primary)" : "var(--card-border)" }}
                    >
                      <span
                        className="inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200"
                        style={{ transform: scriptHidden ? "translateX(18px)" : "translateX(3px)" }}
                      />
                    </span>
                  </label>
                </div>
              </div>
              {scriptHidden ? (
                <div className="flex items-center justify-center py-10 text-[var(--muted)] text-sm italic select-none">
                  Script hidden — practice from memory
                </div>
              ) : (
                <>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--primary)] transition-colors resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-[var(--muted)]">
                      Edit to personalise, then practice recording it.
                    </p>
                    <button
                      onClick={handleSavePitch}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-xs btn-secondary px-3 py-1.5"
                    >
                      {savedIndicator ? (
                        <>
                          <Check size={12} className="text-[var(--success)]" />
                          Saved
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save size={12} />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Right: Recorder ────────────────────────────────── */}
          <div className="space-y-4">
            <div className="gradient-border bg-[var(--card)] rounded-2xl p-5">
              <h2
                className="font-bold text-base mb-4"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Practice Recording
              </h2>

              {/* Video area */}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
                {/* Live preview while recording */}
                <video
                  ref={liveVideoRef}
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${isRecording ? "block" : "hidden"}`}
                />
                {/* Recorded playback */}
                {previewUrl && !isRecording && (
                  <video
                    ref={videoPreviewRef}
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Placeholder */}
                {!isRecording && !previewUrl && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--muted)]">
                    <VideoOff size={32} />
                    <span className="text-sm">Camera preview will appear here</span>
                  </div>
                )}

                {/* Countdown overlay */}
                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 rounded-lg px-2.5 py-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span
                      className="text-white text-sm font-bold tabular-nums"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {countdown}s
                    </span>
                  </div>
                )}
              </div>

              {/* Live transcript */}
              {(isRecording || isStopped) && (
                <div className="border border-[var(--card-border)] rounded-xl p-3 mb-4 min-h-[60px] text-sm leading-relaxed">
                  <p className="text-xs text-[var(--muted)] mb-1 uppercase tracking-wide">
                    Transcript
                  </p>
                  <span className="text-[var(--foreground)]">{transcript}</span>
                  {isRecording && interimTranscript && (
                    <span className="text-[var(--muted)] italic">{interimTranscript}</span>
                  )}
                  {!transcript && !interimTranscript && (
                    <span className="text-[var(--muted)] italic text-xs">
                      {isRecording ? "Listening…" : "No transcript captured."}
                    </span>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-3">
                {recordState === "idle" && (
                  <button
                    onClick={startRecording}
                    className="btn-shine btn-primary flex-1"
                  >
                    <Video size={15} />
                    Start 60s Recording
                  </button>
                )}

                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold hover:bg-red-500/20 transition-colors"
                  >
                    <Square size={14} />
                    Stop Early
                  </button>
                )}

                {isStopped && (
                  <>
                    <button
                      onClick={handleAnalyze}
                      className="btn-shine btn-primary flex-1"
                    >
                      <Star size={15} />
                      Analyze &amp; Score
                    </button>
                    <button
                      onClick={() => {
                        setRecordState("idle");
                        setRecordedBlob(null);
                        setTranscript("");
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }}
                      className="btn-secondary px-3"
                      title="Re-record"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </>
                )}

                {isAnalyzing && (
                  <div className="flex-1 flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing pitch…
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--muted)] mt-3 text-center">
                Camera + microphone permissions required · 60 seconds max
              </p>
            </div>
          </div>
        </div>

        {/* ── Recordings history ──────────────────────────────────── */}
        {pitch.recordings && pitch.recordings.length > 0 && (
          <div className="mt-8">
            <h2
              className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-4"
            >
              Practice History ({pitch.recordings.length})
            </h2>
            <div className="space-y-3">
              {pitch.recordings.map((r) => (
                <RecordingRow key={r.id} recording={r} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
