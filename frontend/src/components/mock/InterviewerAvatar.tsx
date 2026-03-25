"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface InterviewerAvatarProps {
  text: string;
  isSpeaking: boolean;
  onSpeechEnd: () => void;
}

export default function InterviewerAvatar({
  text,
  isSpeaking,
  onSpeechEnd,
}: InterviewerAvatarProps) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    if (animFrameRef.current) {
      clearInterval(animFrameRef.current);
      animFrameRef.current = null;
    }
    setMouthOpen(false);
  }, []);

  useEffect(() => {
    if (!isSpeaking || !text) {
      stopSpeaking();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Daniel") ||
          v.name.includes("Alex") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha"))
    );
    if (preferred) utterance.voice = preferred;

    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      animFrameRef.current = setInterval(() => {
        setMouthOpen((prev) => !prev);
      }, 150);
    };

    utterance.onend = () => {
      if (animFrameRef.current) {
        clearInterval(animFrameRef.current);
        animFrameRef.current = null;
      }
      setMouthOpen(false);
      onSpeechEnd();
    };

    utterance.onerror = () => {
      stopSpeaking();
      onSpeechEnd();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      stopSpeaking();
    };
  }, [text, isSpeaking, onSpeechEnd, stopSpeaking]);

  // Preload voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div className="relative">
        {/* Outer glow ring */}
        {isSpeaking && (
          <div className="absolute -inset-4 rounded-full bg-[#d4a853]/10 animate-pulse" />
        )}

        {/* Main avatar circle */}
        <div
          className="relative w-36 h-36 rounded-full flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, #e0b96a 0%, #d4a853 40%, #b8860b 100%)",
            boxShadow: isSpeaking
              ? "0 0 40px rgba(212, 168, 83, 0.3), 0 0 80px rgba(212, 168, 83, 0.1)"
              : "0 8px 30px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Inner face area */}
          <div className="relative">
            {/* Eyes */}
            <div className="flex gap-5 mb-3">
              <div className="w-3.5 h-3.5 bg-white rounded-full relative shadow-sm">
                <div
                  className={`w-2 h-2 bg-[#1a1c24] rounded-full absolute top-[3px] left-[3px] transition-all duration-200 ${
                    isSpeaking ? "animate-pulse" : ""
                  }`}
                />
              </div>
              <div className="w-3.5 h-3.5 bg-white rounded-full relative shadow-sm">
                <div
                  className={`w-2 h-2 bg-[#1a1c24] rounded-full absolute top-[3px] left-[3px] transition-all duration-200 ${
                    isSpeaking ? "animate-pulse" : ""
                  }`}
                />
              </div>
            </div>

            {/* Mouth */}
            <div className="flex justify-center">
              <div
                className={`bg-white/90 transition-all duration-100 ${
                  mouthOpen
                    ? "w-4 h-3.5 rounded-full"
                    : "w-5 h-1.5 rounded-full"
                }`}
              />
            </div>
          </div>

          {/* Speaking ring animation */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
              <div
                className="absolute -inset-1 rounded-full border border-[#d4a853]/30"
                style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s" }}
              />
            </>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="mt-4 text-center">
        <p className="text-sm font-medium text-white/80">Interviewer</p>
        {isSpeaking && (
          <p className="text-[10px] tracking-wider uppercase text-[#d4a853] mt-1 animate-pulse">
            Speaking
          </p>
        )}
      </div>
    </div>
  );
}
