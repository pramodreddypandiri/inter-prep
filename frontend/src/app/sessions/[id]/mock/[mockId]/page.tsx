"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import InterviewerAvatar from "@/components/mock/InterviewerAvatar";
import EyeTracker, { EyeTrackerRef } from "@/components/video/EyeTracker";
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
  AlertTriangle,
  CheckCircle2,
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

export default function MockInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const mockId = params.mockId as string;

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentInterviewerText, setCurrentInterviewerText] = useState("");
  const [interviewState, setInterviewState] =
    useState<InterviewState>("loading");
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

  const eyeTrackerRef = useRef<EyeTrackerRef>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [micPermission, setMicPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");

  // Load interview data
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
        setError(
          err instanceof Error ? err.message : "Failed to load interview"
        );
      }
    }
    load();
  }, [sessionId, mockId]);

  // Timer
  useEffect(() => {
    if (!startTime || interviewState === "complete") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, interviewState]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, liveTranscript]);

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  // Request microphone permission on mount
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

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const combined = finalTranscript + interim;
      liveTranscriptRef.current = combined;
      setLiveTranscript(combined);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed") {
        isRecordingRef.current = false;
        setIsRecording(false);
        setMicPermission("denied");
        setUseTextInput(true);
        setShowChat(true);
        return;
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch {
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      } else {
        finalTranscript = "";
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

    try {
      recognition.start();
    } catch {
      try {
        recognition.stop();
        setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 100);
      } catch {}
    }
  }, [isMuted, micPermission, getRecognition]);

  const stopRecordingAndSend = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();

    await new Promise((r) => setTimeout(r, 500));

    const message = liveTranscriptRef.current.trim();
    if (!message) return;

    liveTranscriptRef.current = "";
    setLiveTranscript("");
    setInterviewState("processing");

    setTranscript((prev) => [
      ...prev,
      {
        role: "candidate",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);

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
    setTextFallback("");
    setInterviewState("processing");

    setTranscript((prev) => [
      ...prev,
      {
        role: "candidate",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);

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
  }, []);

  const toggleMute = useCallback(() => {
    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      try {
        recognitionRef.current?.stop();
      } catch {}
    }
    setIsMuted((m) => !m);
  }, [isRecording]);

  const handleEndInterview = async () => {
    if (!confirm("Leave the interview? Feedback will be generated.")) return;
    setInterviewState("processing");
    const eyeStats = eyeTrackerRef.current?.getStats();
    try {
      const result = await api.endMockInterview(sessionId, mockId, eyeStats);
      setTranscript(result.transcript);
      setFeedback(result.feedback_report);
      setInterviewState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end");
      setInterviewState("candidate_turn");
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ==================== LOADING ====================
  if (interviewState === "loading") {
    return (
      <div className="h-screen bg-[#0d0f14] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-[#d4a853] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Joining interview...</p>
        </div>
      </div>
    );
  }

  // ==================== FEEDBACK REPORT ====================
  if (interviewState === "complete" && feedback) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="glass border-b border-[var(--card-border)] px-6 py-4 sticky top-0 z-50">
          <button
            onClick={() => router.push(`/sessions/${sessionId}/mock`)}
            className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={12} /> Back to Mock Interviews
          </button>
        </div>
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          <div className="animate-fade-in">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-medium mb-2">
              Performance Review
            </p>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Interview Feedback
            </h1>
          </div>

          {/* Overall Rating */}
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 animate-fade-in-up delay-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-glow)] flex items-center justify-center">
                <Star size={20} className="text-[var(--primary)]" />
              </div>
              <h2
                className="font-semibold text-lg"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Overall Rating
              </h2>
            </div>
            <p className="text-[var(--primary)] font-semibold text-lg">
              {feedback.overall_rating}
            </p>
          </div>

          {/* Three-column metrics */}
          <div className="grid gap-5 md:grid-cols-3 animate-fade-in-up delay-2">
            {[
              {
                title: "Answer Quality",
                value: feedback.answer_quality,
                icon: CheckCircle2,
              },
              {
                title: "Answer Structure",
                value: feedback.answer_structure,
                icon: TrendingUp,
              },
              {
                title: "Communication",
                value: feedback.communication,
                icon: MessageSquare,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                    <item.icon size={14} className="text-[var(--primary)]" />
                  </div>
                  <h3
                    className="font-semibold text-sm"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Eye Tracking */}
          {feedback.eye_tracking_notes && (
            <div className="border border-[var(--primary)]/20 bg-[var(--primary-glow)] rounded-2xl p-5 animate-fade-in-up delay-3">
              <h3
                className="font-semibold mb-2 flex items-center gap-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                <Eye size={16} className="text-[var(--primary)]" /> Eye Tracking
                & Integrity
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {feedback.eye_tracking_notes}
              </p>
            </div>
          )}

          {/* Areas to Improve */}
          <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-6 animate-fade-in-up delay-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[var(--danger)]/10 flex items-center justify-center">
                <AlertTriangle size={14} className="text-[var(--danger)]" />
              </div>
              <h3
                className="font-semibold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Areas to Improve
              </h3>
            </div>
            <ul className="space-y-2.5">
              {feedback.areas_to_improve.map((a, i) => (
                <li key={i} className="text-sm flex items-start gap-2.5">
                  <XCircle
                    size={14}
                    className="text-[var(--danger)] mt-0.5 shrink-0"
                  />
                  <span className="text-[var(--muted)] leading-relaxed">
                    {a}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Question by Question */}
          {feedback.question_by_question && (
            <div className="space-y-4 animate-fade-in-up delay-5">
              <h2
                className="font-semibold text-lg"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Question-by-Question
              </h2>
              {feedback.question_by_question.map((q, i) => (
                <div
                  key={i}
                  className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm leading-relaxed">
                      {q.question}
                    </p>
                    <span
                      className={`text-sm font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                        q.score >= 7
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : q.score >= 4
                          ? "bg-[var(--primary-glow)] text-[var(--primary)]"
                          : "bg-[var(--danger)]/10 text-[var(--danger)]"
                      }`}
                    >
                      {q.score}/10
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {q.assessment}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Transcript */}
          <div className="space-y-3 animate-fade-in-up delay-6">
            <h2
              className="font-semibold text-lg"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Full Transcript
            </h2>
            <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-5 max-h-96 overflow-y-auto space-y-3">
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${
                    entry.role === "candidate" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      entry.role === "candidate"
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface)] text-[var(--foreground)]"
                    }`}
                  >
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

  // ==================== ACTIVE INTERVIEW (CINEMATIC MEET-STYLE) ====================
  return (
    <div className="h-screen flex flex-col bg-[#0d0f14] text-white overflow-hidden">
      {/* ---- Video Grid ---- */}
      <div className="flex-1 flex min-h-0">
        {/* Video tiles */}
        <div className="flex-1 p-3 flex gap-3 min-h-0">
          {/* Interviewer tile */}
          <div className="flex-1 bg-[#1a1c24] rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
            {/* Subtle gradient atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#d4a853]/5 to-transparent pointer-events-none" />

            <InterviewerAvatar
              text={currentInterviewerText}
              isSpeaking={interviewState === "interviewer_speaking"}
              onSpeechEnd={handleSpeechEnd}
            />

            {/* Speaking indicator border */}
            {interviewState === "interviewer_speaking" && (
              <div className="absolute inset-0 rounded-2xl border-2 border-[#d4a853]/60 pointer-events-none" />
            )}

            {/* Name tag */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
              <span className="font-medium">Interviewer</span>
              {interviewState === "interviewer_speaking" && (
                <span className="w-1.5 h-1.5 bg-[#d4a853] rounded-full animate-pulse" />
              )}
            </div>

            {/* Captions overlay */}
            {showCaptions &&
              interviewState === "interviewer_speaking" &&
              currentInterviewerText && (
                <div className="absolute bottom-14 left-4 right-4">
                  <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-center leading-relaxed">
                    {currentInterviewerText.length > 150
                      ? "..." + currentInterviewerText.slice(-150)
                      : currentInterviewerText}
                  </div>
                </div>
              )}
          </div>

          {/* Candidate tile */}
          <div className="flex-1 bg-[#1a1c24] rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0">
              <EyeTracker ref={eyeTrackerRef} autoStart={true} />
            </div>

            {/* Speaking indicator border */}
            {isRecording && (
              <div className="absolute inset-0 rounded-2xl border-2 border-[#56d364]/60 pointer-events-none z-10" />
            )}

            {/* Name tag */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-10">
              <span className="font-medium">You</span>
              {isRecording && (
                <span className="w-1.5 h-1.5 bg-[#56d364] rounded-full animate-pulse" />
              )}
              {isMuted && <MicOff size={10} className="text-red-400" />}
            </div>

            {/* Live caption */}
            {showCaptions && isRecording && liveTranscript && (
              <div className="absolute bottom-14 left-4 right-4 z-10">
                <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-center leading-relaxed">
                  {liveTranscript.length > 150
                    ? "..." + liveTranscript.slice(-150)
                    : liveTranscript}
                </div>
              </div>
            )}

            {/* Status overlay */}
            {interviewState === "processing" && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#d4a853] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-white/50">Processing...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Chat / Transcript Sidebar ---- */}
        {showChat && (
          <div className="w-80 bg-[#13151a] flex flex-col border-l border-[#1e2028] animate-slide-in-right">
            <div className="px-4 py-3.5 border-b border-[#1e2028] flex items-center justify-between">
              <h3 className="text-sm font-medium">Transcript</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <XCircle size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {transcript.map((entry, i) => (
                <div key={i} className="text-sm">
                  <span
                    className={`text-[10px] font-semibold tracking-wider uppercase block mb-1 ${
                      entry.role === "interviewer"
                        ? "text-[#d4a853]"
                        : "text-[#56d364]"
                    }`}
                  >
                    {entry.role === "interviewer" ? "Interviewer" : "You"}
                  </span>
                  <p className="text-white/70 leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              ))}

              {isRecording && liveTranscript && (
                <div className="text-sm">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#56d364] block mb-1">
                    You (live)
                  </span>
                  <p className="text-white/40 italic leading-relaxed">
                    {liveTranscript}
                  </p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Text input */}
            {interviewState === "candidate_turn" && (
              <div className="p-3 border-t border-[#1e2028]">
                <div className="flex gap-2">
                  <input
                    value={textFallback}
                    onChange={(e) => setTextFallback(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleTextSend();
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-[#1a1c24] rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#d4a853]/50"
                    placeholder="Type your answer..."
                  />
                  <button
                    onClick={handleTextSend}
                    disabled={!textFallback.trim()}
                    className="p-2.5 bg-[#d4a853] rounded-xl hover:bg-[#e0b96a] disabled:opacity-30 transition-colors"
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
        <div className="mx-4 mb-1 p-2.5 rounded-xl bg-red-500/15 text-red-300 text-xs text-center">
          {error}
        </div>
      )}

      {/* ---- Bottom Control Bar ---- */}
      <div className="bg-[#0d0f14] border-t border-[#1a1c24] px-6 py-3.5 flex items-center justify-between">
        {/* Left: time info */}
        <div className="flex items-center gap-3 text-sm text-white/40 font-mono">
          <Clock size={13} />
          <span>{formatTime(elapsed)}</span>
          <span className="text-white/15">/</span>
          <span>{duration}:00</span>
        </div>

        {/* Center: controls */}
        <div className="flex items-center gap-3">
          {/* Mic toggle */}
          <button
            onClick={() => {
              if (isMuted) {
                setIsMuted(false);
                if (interviewState === "candidate_turn") startRecording();
              } else {
                toggleMute();
              }
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                : "bg-[#1a1c24] hover:bg-[#262830] border border-[#2a2c34]"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Done Speaking */}
          {isRecording && !isMuted && (
            <button
              onClick={stopRecordingAndSend}
              className="h-12 px-6 bg-[#d4a853] rounded-full flex items-center gap-2 text-sm font-medium hover:bg-[#e0b96a] transition-all shadow-lg shadow-[#d4a853]/20"
            >
              <Send size={15} />
              Done Speaking
            </button>
          )}

          {/* Speak button */}
          {!isRecording &&
            !isMuted &&
            interviewState === "candidate_turn" &&
            micPermission === "granted" && (
              <button
                onClick={startRecording}
                className="h-12 px-6 bg-[#1a1c24] border border-[#2a2c34] rounded-full flex items-center gap-2 text-sm hover:bg-[#262830] transition-all"
              >
                <Mic size={15} />
                Speak
              </button>
            )}

          {/* Captions toggle */}
          <button
            onClick={() => setShowCaptions((c) => !c)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
              showCaptions
                ? "bg-[#1a1c24] border-[#2a2c34] hover:bg-[#262830]"
                : "bg-transparent border-[#1e2028] hover:bg-[#1a1c24]"
            }`}
            title={showCaptions ? "Hide captions" : "Show captions"}
          >
            {showCaptions ? (
              <Captions size={18} />
            ) : (
              <CaptionsOff size={18} />
            )}
          </button>

          {/* End call */}
          <button
            onClick={handleEndInterview}
            disabled={interviewState === "processing"}
            className="w-14 h-12 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
            title="Leave interview"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        {/* Right: chat toggle */}
        <div className="flex items-center gap-3">
          {micPermission === "denied" && (
            <span className="text-[10px] text-red-400/80">
              Mic unavailable
            </span>
          )}
          {micPermission === "pending" && (
            <span className="text-[10px] text-[#d4a853]/80">
              Requesting mic...
            </span>
          )}
          <button
            onClick={() => setShowChat((c) => !c)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
              showChat
                ? "bg-[#d4a853] border-[#d4a853] shadow-lg shadow-[#d4a853]/20"
                : "bg-[#1a1c24] border-[#2a2c34] hover:bg-[#262830]"
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
