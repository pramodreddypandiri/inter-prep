"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" fires on silence — just ignore and let it restart
      if (event.error === "no-speech") return;
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      // If still supposed to be recording (e.g. after no-speech), restart
      if (recognitionRef.current && isRecordingRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Already started or other error — fall through to stop
        }
      }
      setIsRecording(false);
      setIsProcessing(false);
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      isRecordingRef.current = false;
      setIsProcessing(true);
      recognitionRef.current.stop();
    } else {
      setTranscript("");
      isRecordingRef.current = true;
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  const isSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!isSupported) {
    return (
      <p className="text-sm text-[var(--danger)]">
        Speech recognition is not supported in this browser. Please use Chrome.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isRecording
            ? "bg-[var(--danger)] text-white hover:bg-red-600"
            : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
        } disabled:opacity-50`}
      >
        {isProcessing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isRecording ? (
          <MicOff size={16} />
        ) : (
          <Mic size={16} />
        )}
        {isProcessing
          ? "Processing..."
          : isRecording
          ? "Stop Recording"
          : "Start Recording"}
      </button>

      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--danger)] rounded-full animate-pulse" />
          <span className="text-sm text-[var(--muted)]">Recording...</span>
        </div>
      )}

      {transcript && (
        <div className="p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm">
          {transcript}
        </div>
      )}
    </div>
  );
}
