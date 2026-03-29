"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import InterviewerAvatar from "@/components/mock/InterviewerAvatar";
import EyeTracker, { EyeTrackerRef } from "@/components/video/EyeTracker";
import { TimingAnalyzer } from "@/lib/detection/timing-analyzer";
import type { GazeSignal, AudioSignal, RiskSnapshot } from "@/lib/detection/types";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  Send,
  ArrowLeft,
  Clock,
  Mic,
  MicOff,
  MessageSquare,
  PhoneOff,
  XCircle,
  Eye,
  Captions,
  CaptionsOff,
  Star,
  TrendingUp,
  CheckCircle2,
  Activity,
  Keyboard,
  Users,
  Monitor,
  Focus,
  Lightbulb,
} from "lucide-react";

interface TranscriptEntry {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

interface FeedbackReport {
  answer_quality: string;
  answer_structure: string;
  communication: string;
  eye_tracking_notes?: string;
  areas_to_improve: string[];
  overall_rating: string;
  question_by_question?: {
    question: string;
    assessment: string;
    score: number;
  }[];
}

type InterviewState =
  | "loading"
  | "interviewer_speaking"
  | "candidate_turn"
  | "processing"
  | "complete";

// ─── Focus Score Indicator (reframed from "Risk") ───

function FocusIndicator({ score, flags }: { score: number; flags: string[] }) {
  // Invert: 100 - riskScore = focus score (higher = better)
  const focusScore = Math.max(0, 100 - score);
  const color =
    focusScore >= 75
      ? "text-emerald-400"
      : focusScore >= 50
      ? "text-amber-400"
      : focusScore >= 25
      ? "text-orange-400"
      : "text-rose-400";
  const label =
    focusScore >= 75
      ? "Great"
      : focusScore >= 50
      ? "Good"
      : focusScore >= 25
      ? "Fair"
      : "Needs Work";

  return (
    <div className="relative group">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 cursor-default">
        <Focus size={12} className={color} />
        <span className={`text-[10px] font-mono font-bold ${color}`}>
          {focusScore}
        </span>
        <span className="text-[9px] text-white/40">{label}</span>
      </div>

      {flags.length > 0 && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#1a1c24] border border-white/10 rounded-xl p-3 hidden group-hover:block z-50 shadow-xl">
          <p className="text-[10px] font-semibold text-white/60 mb-2 uppercase tracking-wider">
            Focus Tips
          </p>
          <div className="space-y-1.5">
            {flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-white/50">
                <Lightbulb size={9} className="text-amber-400 mt-0.5 shrink-0" />
                {flag}
              </div>
            ))}
          </div>
          <div className="mt-2.5 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                focusScore >= 75 ? "bg-emerald-400" : focusScore >= 50 ? "bg-amber-400" : "bg-orange-400"
              }`}
              style={{ width: `${focusScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Interview Presence Report (reframed from "Integrity") ───

function PresenceReport({
  stats,
}: {
  stats: {
    totalLookAways: number;
    readingPatterns: number;
    tabSwitchCount: number;
    typingDetections: number;
    secondSpeakerDetections: number;
    currentRiskScore: number;
    riskTimeline: RiskSnapshot[];
  };
}) {
  // Invert score: higher = better
  const focusScore = Math.max(0, 100 - stats.currentRiskScore);
  const maxFocus = Math.max(0, 100 - Math.max(...stats.riskTimeline.map((s) => s.score), stats.currentRiskScore));

  return (
    <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center">
          <Focus size={20} className="text-[var(--accent)]" />
        </div>
        <div>
          <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
            Interview Presence
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Body language and engagement coaching insights
          </p>
        </div>
      </div>

      {/* Overall focus score */}
      <div className="flex items-center gap-4">
        <div
          className={`text-3xl font-bold font-mono ${
            focusScore >= 75
              ? "text-emerald-400"
              : focusScore >= 50
              ? "text-amber-400"
              : focusScore >= 25
              ? "text-orange-400"
              : "text-rose-400"
          }`}
        >
          {focusScore}
        </div>
        <div>
          <p className="text-sm font-semibold">
            Focus Score <span className="text-[var(--muted)] font-normal">/ 100</span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            Best: {100 - maxFocus} &middot; Samples: {stats.riskTimeline.length}
          </p>
        </div>
      </div>

      {/* Metrics grid — reframed as coaching */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Eye, label: "Eye Contact Breaks", value: stats.totalLookAways, note: stats.totalLookAways > 5 },
          { icon: Activity, label: "Reading Patterns", value: stats.readingPatterns, note: stats.readingPatterns > 2 },
          { icon: Monitor, label: "Focus Shifts", value: stats.tabSwitchCount, note: stats.tabSwitchCount > 0 },
          { icon: Keyboard, label: "Typing Pauses", value: stats.typingDetections, note: stats.typingDetections > 0 },
          { icon: Users, label: "Background Voices", value: stats.secondSpeakerDetections, note: stats.secondSpeakerDetections > 0 },
        ].map((metric) => (
          <div
            key={metric.label}
            className={`rounded-xl p-3 border ${
              metric.note
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-[var(--card-border)] bg-[var(--surface)]"
            }`}
          >
            <metric.icon
              size={14}
              className={metric.note ? "text-amber-400" : "text-[var(--muted)]"}
            />
            <p className={`text-xl font-bold mt-1 ${metric.note ? "text-amber-400" : ""}`}>
              {metric.value}
            </p>
            <p className="text-[10px] text-[var(--muted)]">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Focus timeline */}
      {stats.riskTimeline.length > 1 && (
        <div>
          <p className="text-xs text-[var(--muted)] mb-2">Focus Score Over Time</p>
          <div className="flex items-end gap-px h-16">
            {stats.riskTimeline.map((snap, i) => {
              const focus = Math.max(0, 100 - snap.score);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(2, focus)}%`,
                    backgroundColor:
                      focus >= 75 ? "#34d399" : focus >= 50 ? "#fbbf24" : focus >= 25 ? "#fb923c" : "#fb7185",
                    opacity: 0.7,
                  }}
                  title={`Focus: ${focus} at ${new Date(snap.timestamp).toLocaleTimeString()}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Radar Chart for Skills ───

function SkillsRadar({ feedback }: { feedback: FeedbackReport }) {
  // Estimate scores from text length/sentiment (simple heuristic since we have text feedback)
  const estimateScore = (text: string) => {
    if (!text) return 5;
    const positiveWords = ["excellent", "strong", "great", "good", "well", "clear", "effective", "solid", "impressive"];
    const negativeWords = ["weak", "poor", "needs", "lacking", "unclear", "improve", "struggle", "miss"];
    const lower = text.toLowerCase();
    let score = 6;
    positiveWords.forEach((w) => { if (lower.includes(w)) score += 0.5; });
    negativeWords.forEach((w) => { if (lower.includes(w)) score -= 0.5; });
    return Math.min(10, Math.max(2, Math.round(score)));
  };

  const data = [
    { skill: "Answer Quality", value: estimateScore(feedback.answer_quality) },
    { skill: "Structure", value: estimateScore(feedback.answer_structure) },
    { skill: "Communication", value: estimateScore(feedback.communication) },
    { skill: "Presence", value: feedback.eye_tracking_notes ? estimateScore(feedback.eye_tracking_notes) : 7 },
    { skill: "Depth", value: feedback.question_by_question
      ? Math.round(feedback.question_by_question.reduce((a, q) => a + q.score, 0) / feedback.question_by_question.length)
      : 6
    },
  ];

  return (
    <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6">
      <h2 className="font-bold text-lg mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
        Skills Overview
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="var(--card-border)" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 10]}
              tick={{ fill: "var(--muted)", fontSize: 9 }}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function MockInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const mockId = params.mockId as string;

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentInterviewerText, setCurrentInterviewerText] = useState("");
  const [interviewState, setInterviewState] = useState<InterviewState>("loading");
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [duration, setDuration] = useState(30);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [textFallback, setTextFallback] = useState("");
  const [useTextInput, setUseTextInput] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);

  // Detection state
  const [riskScore, setRiskScore] = useState(0);
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [integrityStats, setIntegrityStats] = useState<{
    totalLookAways: number;
    readingPatterns: number;
    tabSwitchCount: number;
    typingDetections: number;
    secondSpeakerDetections: number;
    currentRiskScore: number;
    riskTimeline: RiskSnapshot[];
  } | null>(null);

  const eyeTrackerRef = useRef<EyeTrackerRef>(null);
  const timingAnalyzerRef = useRef<TimingAnalyzer>(new TimingAnalyzer());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [micPermission, setMicPermission] = useState<"pending" | "granted" | "denied">("pending");

  useEffect(() => {
    const ta = timingAnalyzerRef.current;
    ta.setOnSignal(() => {
      const stats = eyeTrackerRef.current?.getStats();
      if (stats) setRiskScore(stats.currentRiskScore);
    });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const mock = await api.getMockInterview(sessionId, mockId);
        setTranscript(mock.transcript);
        setDuration(mock.duration);
        if (mock.transcript.length > 0) {
          setStartTime(new Date(mock.transcript[0].timestamp));
        }
        if (mock.feedback_report) {
          setFeedback(mock.feedback_report);
          setInterviewState("complete");
        } else if (mock.transcript.length > 0) {
          const lastMsg = mock.transcript[mock.transcript.length - 1];
          if (lastMsg.role === "interviewer") {
            setCurrentInterviewerText(lastMsg.content);
            setInterviewState("interviewer_speaking");
          } else {
            setInterviewState("candidate_turn");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load interview");
      }
    }
    load();
  }, [sessionId, mockId]);

  useEffect(() => {
    if (!startTime || interviewState === "complete") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, interviewState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, liveTranscript]);

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setUseTextInput(true);
      setMicPermission("denied");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setMicPermission("granted");
      })
      .catch(() => {
        setMicPermission("denied");
        setUseTextInput(true);
        setShowChat(true);
      });
    return () => { if (recognitionRef.current) recognitionRef.current.abort(); };
  }, []);

  const handleGazeSignal = useCallback((signal: GazeSignal) => {}, []);
  const handleAudioSignal = useCallback((signal: AudioSignal) => {}, []);
  const handleRiskUpdate = useCallback((score: number) => {
    setRiskScore(score);
    const stats = eyeTrackerRef.current?.getStats();
    if (stats) {
      const timeline = stats.riskTimeline;
      const latestSnap = timeline[timeline.length - 1];
      setRiskFlags(latestSnap?.flags || []);
    }
  }, []);

  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";
    let firstWordDetected = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      const combined = finalTranscript + interim;
      liveTranscriptRef.current = combined;
      setLiveTranscript(combined);
      if (!firstWordDetected && combined.trim().length > 0) {
        firstWordDetected = true;
        timingAnalyzerRef.current.markResponseStart();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed") {
        isRecordingRef.current = false;
        setIsRecording(false);
        setMicPermission("denied");
        setUseTextInput(true);
        setShowChat(true);
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try { recognition.start(); } catch { isRecordingRef.current = false; setIsRecording(false); }
      } else {
        finalTranscript = "";
        firstWordDetected = false;
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, []);

  const startRecording = useCallback(() => {
    if (isMuted || micPermission !== "granted") return;
    const recognition = getRecognition();
    if (!recognition) return;
    liveTranscriptRef.current = "";
    setLiveTranscript("");
    isRecordingRef.current = true;
    setIsRecording(true);
    try { recognition.start(); } catch {
      try { recognition.stop(); setTimeout(() => { try { recognition.start(); } catch {} }, 100); } catch {}
    }
  }, [isMuted, micPermission, getRecognition]);

  const stopRecordingAndSend = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    await new Promise((r) => setTimeout(r, 500));
    const message = liveTranscriptRef.current.trim();
    if (!message) return;
    timingAnalyzerRef.current.analyzeResponse(message);
    liveTranscriptRef.current = "";
    setLiveTranscript("");
    setInterviewState("processing");
    setTranscript((prev) => [...prev, { role: "candidate", content: message, timestamp: new Date().toISOString() }]);
    try {
      const result = await api.sendMockMessage(sessionId, mockId, message);
      setTranscript(result.transcript);
      if (result.is_complete) {
        setInterviewState("complete");
        const mock = await api.getMockInterview(sessionId, mockId);
        if (mock.feedback_report) setFeedback(mock.feedback_report);
      } else {
        setCurrentInterviewerText(result.interviewer_message);
        setInterviewState("interviewer_speaking");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setInterviewState("candidate_turn");
    }
  }, [sessionId, mockId]);

  const handleTextSend = async () => {
    const message = textFallback.trim();
    if (!message) return;
    timingAnalyzerRef.current.markResponseStart();
    timingAnalyzerRef.current.analyzeResponse(message);
    setTextFallback("");
    setInterviewState("processing");
    setTranscript((prev) => [...prev, { role: "candidate", content: message, timestamp: new Date().toISOString() }]);
    try {
      const result = await api.sendMockMessage(sessionId, mockId, message);
      setTranscript(result.transcript);
      if (result.is_complete) {
        setInterviewState("complete");
        const mock = await api.getMockInterview(sessionId, mockId);
        if (mock.feedback_report) setFeedback(mock.feedback_report);
      } else {
        setCurrentInterviewerText(result.interviewer_message);
        setInterviewState("interviewer_speaking");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setInterviewState("candidate_turn");
    }
  };

  const handleSpeechEnd = useCallback(() => {
    setInterviewState("candidate_turn");
    timingAnalyzerRef.current.markQuestionAsked(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      try { recognitionRef.current?.stop(); } catch {}
    }
    setIsMuted((m) => !m);
  }, [isRecording]);

  const handleEndInterview = async () => {
    if (!confirm("Leave the interview? Feedback will be generated.")) return;
    setInterviewState("processing");
    const stats = eyeTrackerRef.current?.getStats();
    setIntegrityStats(stats ? {
      totalLookAways: stats.totalLookAways,
      readingPatterns: stats.readingPatterns,
      tabSwitchCount: stats.tabSwitchCount,
      typingDetections: stats.typingDetections,
      secondSpeakerDetections: stats.secondSpeakerDetections,
      currentRiskScore: stats.currentRiskScore,
      riskTimeline: stats.riskTimeline,
    } : null);
    const eyeTrackingPayload = stats
      ? { totalLookAways: stats.totalLookAways, readingPatterns: stats.readingPatterns, suspiciousEvents: stats.suspiciousEvents }
      : undefined;
    try {
      const result = await api.endMockInterview(sessionId, mockId, eyeTrackingPayload);
      setTranscript(result.transcript);
      setFeedback(result.feedback_report);
      setInterviewState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end");
      setInterviewState("candidate_turn");
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ==================== LOADING ====================
  if (interviewState === "loading") {
    return (
      <div className="h-screen bg-[#09090f] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Joining interview...</p>
        </div>
      </div>
    );
  }

  // ==================== FEEDBACK REPORT ====================
  if (interviewState === "complete" && feedback) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="glass border-b border-[var(--card-border)] px-5 py-4 sticky top-0 z-50">
          <button
            onClick={() => router.push(`/sessions/${sessionId}/mock`)}
            className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={12} /> Back to Mock Interviews
          </button>
        </div>
        <main className="max-w-4xl mx-auto px-5 py-8 md:py-10 space-y-7">
          <div className="animate-fade-in">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-semibold mb-2">
              Performance Review
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold" style={{ fontFamily: "'Syne', sans-serif" }}>
              Interview Feedback
            </h1>
          </div>

          {/* Overall Rating */}
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 animate-fade-in-up delay-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-glow)] flex items-center justify-center">
                <Star size={20} className="text-[var(--primary)]" />
              </div>
              <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                Overall Rating
              </h2>
            </div>
            <p className="text-[var(--primary)] font-bold text-lg">{feedback.overall_rating}</p>
          </div>

          {/* Radar Chart */}
          <div className="animate-fade-in-up delay-2">
            <SkillsRadar feedback={feedback} />
          </div>

          {/* Three-column metrics */}
          <div className="grid gap-4 md:grid-cols-3 animate-fade-in-up delay-2">
            {[
              { title: "Answer Quality", value: feedback.answer_quality, icon: CheckCircle2 },
              { title: "Answer Structure", value: feedback.answer_structure, icon: TrendingUp },
              { title: "Communication", value: feedback.communication, icon: MessageSquare },
            ].map((item) => (
              <div key={item.title} className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary-glow)] flex items-center justify-center">
                    <item.icon size={14} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Interview Presence (reframed from Integrity) */}
          {integrityStats && (
            <div className="animate-fade-in-up delay-3">
              <PresenceReport stats={integrityStats} />
            </div>
          )}

          {/* Legacy Eye Tracking Notes */}
          {feedback.eye_tracking_notes && !integrityStats && (
            <div className="border border-[var(--accent)]/20 bg-[var(--accent-glow)] rounded-2xl p-5 animate-fade-in-up delay-3">
              <h3 className="font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                <Eye size={16} className="text-[var(--accent)]" /> Interview Presence
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{feedback.eye_tracking_notes}</p>
            </div>
          )}

          {/* Areas to Improve */}
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 animate-fade-in-up delay-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Lightbulb size={14} className="text-amber-400" />
              </div>
              <h3 className="font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
                Areas to Improve
              </h3>
            </div>
            <ul className="space-y-2.5">
              {feedback.areas_to_improve.map((a, i) => (
                <li key={i} className="text-sm flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span className="text-[var(--muted)] leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Question by Question */}
          {feedback.question_by_question && (
            <div className="space-y-4 animate-fade-in-up delay-5">
              <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                Question-by-Question
              </h2>
              {feedback.question_by_question.map((q, i) => (
                <div key={i} className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-sm leading-relaxed">{q.question}</p>
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      q.score >= 7 ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : q.score >= 4 ? "tag-primary" : "bg-[var(--danger)]/10 text-[var(--danger)]"
                    }`}>
                      {q.score}/10
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{q.assessment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Transcript */}
          <div className="space-y-3 animate-fade-in-up delay-6">
            <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
              Full Transcript
            </h2>
            <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5 max-h-96 overflow-y-auto space-y-3">
              {transcript.map((entry, i) => (
                <div key={i} className={`flex ${entry.role === "candidate" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    entry.role === "candidate"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface)] text-[var(--foreground)]"
                  }`}>
                    {entry.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== ACTIVE INTERVIEW ====================
  return (
    <div className="h-screen flex flex-col bg-[#09090f] text-white overflow-hidden">
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 p-3 flex gap-3 min-h-0">
          {/* Interviewer tile */}
          <div className="flex-1 bg-[#141420] rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent pointer-events-none" />
            <InterviewerAvatar
              text={currentInterviewerText}
              isSpeaking={interviewState === "interviewer_speaking"}
              onSpeechEnd={handleSpeechEnd}
            />
            {interviewState === "interviewer_speaking" && (
              <div className="absolute inset-0 rounded-2xl border-2 border-[var(--primary)]/60 pointer-events-none" />
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
              <span className="font-semibold">Interviewer</span>
              {interviewState === "interviewer_speaking" && (
                <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse" />
              )}
            </div>
            {showCaptions && interviewState === "interviewer_speaking" && currentInterviewerText && (
              <div className="absolute bottom-14 left-4 right-4">
                <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-center leading-relaxed">
                  {currentInterviewerText.length > 150 ? "..." + currentInterviewerText.slice(-150) : currentInterviewerText}
                </div>
              </div>
            )}
          </div>

          {/* Candidate tile */}
          <div className="flex-1 bg-[#141420] rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0">
              <EyeTracker
                ref={eyeTrackerRef}
                autoStart={true}
                onGazeSignal={handleGazeSignal}
                onAudioSignal={handleAudioSignal}
                onRiskUpdate={handleRiskUpdate}
              />
            </div>
            {isRecording && (
              <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/60 pointer-events-none z-10" />
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-10">
              <span className="font-semibold">You</span>
              {isRecording && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
              {isMuted && <MicOff size={10} className="text-rose-400" />}
            </div>
            <div className="absolute top-3 right-3 z-10">
              <FocusIndicator score={riskScore} flags={riskFlags} />
            </div>
            {showCaptions && isRecording && liveTranscript && (
              <div className="absolute bottom-14 left-4 right-4 z-10">
                <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-center leading-relaxed">
                  {liveTranscript.length > 150 ? "..." + liveTranscript.slice(-150) : liveTranscript}
                </div>
              </div>
            )}
            {interviewState === "processing" && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-white/50">Processing...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-80 bg-[#0f0f1a] flex flex-col border-l border-[#1e2030] animate-slide-in-right">
            <div className="px-4 py-3.5 border-b border-[#1e2030] flex items-center justify-between">
              <h3 className="text-sm font-semibold">Transcript</h3>
              <button onClick={() => setShowChat(false)} className="text-white/30 hover:text-white/70 transition-colors">
                <XCircle size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {transcript.map((entry, i) => (
                <div key={i} className="text-sm">
                  <span className={`text-[10px] font-bold tracking-wider uppercase block mb-1 ${
                    entry.role === "interviewer" ? "text-[var(--primary)]" : "text-emerald-400"
                  }`}>
                    {entry.role === "interviewer" ? "Interviewer" : "You"}
                  </span>
                  <p className="text-white/70 leading-relaxed">{entry.content}</p>
                </div>
              ))}
              {isRecording && liveTranscript && (
                <div className="text-sm">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 block mb-1">You (live)</span>
                  <p className="text-white/40 italic leading-relaxed">{liveTranscript}</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {interviewState === "candidate_turn" && (
              <div className="p-3 border-t border-[#1e2030]">
                <div className="flex gap-2">
                  <input
                    value={textFallback}
                    onChange={(e) => setTextFallback(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTextSend(); } }}
                    className="flex-1 px-3.5 py-2.5 bg-[#141420] rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50"
                    placeholder="Type your answer..."
                  />
                  <button
                    onClick={handleTextSend}
                    disabled={!textFallback.trim()}
                    className="p-2.5 bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-hover)] disabled:opacity-30 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-1 p-2.5 rounded-xl bg-rose-500/15 text-rose-300 text-xs text-center">{error}</div>
      )}

      {/* Bottom Control Bar */}
      <div className="bg-[#09090f] border-t border-[#141420] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-white/40 font-mono">
          <Clock size={13} />
          <span>{formatTime(elapsed)}</span>
          <span className="text-white/15">/</span>
          <span>{duration}:00</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (isMuted) { setIsMuted(false); if (interviewState === "candidate_turn") startRecording(); } else { toggleMute(); } }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20" : "bg-[#141420] hover:bg-[#1c1c30] border border-[#25253a]"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {isRecording && !isMuted && (
            <button
              onClick={stopRecordingAndSend}
              className="h-12 px-6 bg-[var(--primary)] rounded-full flex items-center gap-2 text-sm font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary)]/20"
            >
              <Send size={15} /> Done Speaking
            </button>
          )}

          {!isRecording && !isMuted && interviewState === "candidate_turn" && micPermission === "granted" && (
            <button
              onClick={startRecording}
              className="h-12 px-6 bg-[#141420] border border-[#25253a] rounded-full flex items-center gap-2 text-sm hover:bg-[#1c1c30] transition-all"
            >
              <Mic size={15} /> Speak
            </button>
          )}

          <button
            onClick={() => setShowCaptions((c) => !c)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
              showCaptions ? "bg-[#141420] border-[#25253a] hover:bg-[#1c1c30]" : "bg-transparent border-[#1e2030] hover:bg-[#141420]"
            }`}
            title={showCaptions ? "Hide captions" : "Show captions"}
          >
            {showCaptions ? <Captions size={18} /> : <CaptionsOff size={18} />}
          </button>

          <button
            onClick={handleEndInterview}
            disabled={interviewState === "processing"}
            className="w-14 h-12 bg-rose-500 rounded-full flex items-center justify-center hover:bg-rose-600 transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20"
            title="Leave interview"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {micPermission === "denied" && <span className="text-[10px] text-rose-400/80">Mic unavailable</span>}
          {micPermission === "pending" && <span className="text-[10px] text-amber-400/80">Requesting mic...</span>}
          <button
            onClick={() => setShowChat((c) => !c)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
              showChat ? "bg-[var(--primary)] border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20" : "bg-[#141420] border-[#25253a] hover:bg-[#1c1c30]"
            }`}
            title="Transcript"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
