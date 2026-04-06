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
  const [blinking, setBlinking] = useState(false);
  const [breatheUp, setBreatheUp] = useState(false);

  const mouthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breatheTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Random blinking
  useEffect(() => {
    function scheduleBlink() {
      const delay = 2800 + Math.random() * 3200;
      blinkTimerRef.current = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, 160);
      }, delay);
    }
    scheduleBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Breathing
  useEffect(() => {
    breatheTimerRef.current = setInterval(() => setBreatheUp((p) => !p), 3200);
    return () => {
      if (breatheTimerRef.current) clearInterval(breatheTimerRef.current);
    };
  }, []);

  // Speech + mouth animation
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    if (mouthTimerRef.current) {
      clearInterval(mouthTimerRef.current);
      mouthTimerRef.current = null;
    }
    setMouthOpen(false);
  }, []);

  useEffect(() => {
    if (!isSpeaking || !text) {
      stopSpeaking();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Samantha") ||
          v.name.includes("Victoria") ||
          v.name.includes("Karen") ||
          v.name.includes("Moira") ||
          v.name.includes("Google UK English Female") ||
          v.name.includes("Microsoft Zira") ||
          v.name.toLowerCase().includes("female"))
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.rate = 0.92;
    utterance.pitch = 1.1;

    utterance.onstart = () => {
      mouthTimerRef.current = setInterval(() => setMouthOpen((p) => !p), 130);
    };
    utterance.onend = () => {
      if (mouthTimerRef.current) {
        clearInterval(mouthTimerRef.current);
        mouthTimerRef.current = null;
      }
      setMouthOpen(false);
      onSpeechEnd();
    };
    utterance.onerror = () => {
      stopSpeaking();
      onSpeechEnd();
    };

    window.speechSynthesis.speak(utterance);
    return stopSpeaking;
  }, [text, isSpeaking, onSpeechEnd, stopSpeaking]);

  // Preload voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    const h = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", h);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", h);
  }, []);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Outer speaking halo rings */}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute rounded-full border border-[var(--primary)]/20 animate-ping"
            style={{ width: 300, height: 300 }}
          />
          <div
            className="absolute rounded-full border border-[var(--primary)]/10 animate-ping"
            style={{ width: 240, height: 240, animationDelay: "0.6s" }}
          />
        </div>
      )}

      <svg
        viewBox="0 0 200 250"
        width="260"
        height="325"
        style={{
          transform: breatheUp ? "translateY(-3px)" : "translateY(0px)",
          transition: "transform 3.2s ease-in-out, filter 0.5s ease",
          filter: isSpeaking
            ? "drop-shadow(0 0 20px rgba(16,185,129,0.28))"
            : "drop-shadow(0 10px 28px rgba(0,0,0,0.55))",
        }}
        aria-label="AI Interviewer"
      >
        <defs>
          <radialGradient id="av-skin" cx="40%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#FCDCBD" />
            <stop offset="68%" stopColor="#EFB88A" />
            <stop offset="100%" stopColor="#D4906A" />
          </radialGradient>
          <radialGradient id="av-skin-neck" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F0BF92" />
            <stop offset="100%" stopColor="#D4956A" />
          </radialGradient>
          <linearGradient id="av-hair" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#3D2010" />
            <stop offset="45%" stopColor="#231008" />
            <stop offset="100%" stopColor="#0E0604" />
          </linearGradient>
          <radialGradient id="av-iris-l" cx="35%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#6E4428" />
            <stop offset="55%" stopColor="#3D2010" />
            <stop offset="100%" stopColor="#180C04" />
          </radialGradient>
          <radialGradient id="av-iris-r" cx="35%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#6E4428" />
            <stop offset="55%" stopColor="#3D2010" />
            <stop offset="100%" stopColor="#180C04" />
          </radialGradient>
          <linearGradient id="av-blazer" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#1d2244" />
            <stop offset="100%" stopColor="#10142d" />
          </linearGradient>
          <radialGradient id="av-blush-l" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F4A0A0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#F4A0A0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="av-blush-r" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F4A0A0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#F4A0A0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="av-earring" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F8E0A0" />
            <stop offset="100%" stopColor="#C8961A" />
          </radialGradient>
        </defs>

        {/* ── Blazer ── */}
        <path
          d="M5,250 L5,205 C5,192 18,183 42,175 L78,163 L100,182 L122,163
             L158,175 C182,183 195,192 195,205 L195,250 Z"
          fill="url(#av-blazer)"
        />
        {/* Lapels */}
        <path d="M78,163 L100,182 L90,202 L66,180 Z" fill="#24295a" />
        <path d="M122,163 L100,182 L110,202 L134,180 Z" fill="#24295a" />
        {/* Inner blouse */}
        <path
          d="M90,169 L100,181 L110,169 L105,177 L100,184 L95,177 Z"
          fill="#F0EFF8"
        />
        <path
          d="M90,169 C94,166 98,165 100,166 C102,165 106,166 110,169"
          stroke="#D8D7EE"
          strokeWidth="0.8"
          fill="none"
          opacity="0.5"
        />
        {/* Buttons */}
        <circle cx="100" cy="210" r="2.5" fill="#2a305e" />
        <circle cx="100" cy="225" r="2.5" fill="#2a305e" />

        {/* ── Neck ── */}
        <path
          d="M88,158 C88,166 90,173 100,175 C110,173 112,166 112,158
             L111,150 C108,154 92,154 89,150 Z"
          fill="url(#av-skin-neck)"
        />
        <path
          d="M97,158 C96,165 97,172 100,175 C103,172 104,165 103,158 Z"
          fill="#C4855A"
          opacity="0.18"
        />

        {/* ── Hair back mass ── */}
        <ellipse cx="100" cy="94" rx="65" ry="76" fill="url(#av-hair)" />

        {/* ── Ears ── */}
        <ellipse cx="36" cy="108" rx="8" ry="10" fill="#E8B580" />
        <ellipse cx="38" cy="108" rx="5" ry="7" fill="#CF9A68" />
        <ellipse cx="164" cy="108" rx="8" ry="10" fill="#E8B580" />
        <ellipse cx="162" cy="108" rx="5" ry="7" fill="#CF9A68" />
        {/* Earrings */}
        <circle cx="36" cy="117" r="4.5" fill="url(#av-earring)" />
        <circle cx="37.5" cy="115.5" r="1.5" fill="white" opacity="0.7" />
        <circle cx="164" cy="117" r="4.5" fill="url(#av-earring)" />
        <circle cx="165.5" cy="115.5" r="1.5" fill="white" opacity="0.7" />

        {/* ── Face ── */}
        <ellipse cx="100" cy="108" rx="58" ry="68" fill="url(#av-skin)" />
        <ellipse cx="100" cy="162" rx="36" ry="10" fill="#C4855A" opacity="0.08" />

        {/* ── Hair front / hairline ── */}
        <path
          d="M42,65 C44,33 66,17 100,17 C134,17 156,33 158,65
             C150,44 137,34 124,37 C114,40 107,48 100,52
             C93,48 86,40 76,37 C63,34 50,44 42,65 Z"
          fill="url(#av-hair)"
        />
        {/* Hair sheen */}
        <path
          d="M58,28 C64,19 76,14 90,15 C96,15 99,20 100,24
             C101,20 104,15 110,15 C124,14 136,19 142,28
             C134,18 124,14 114,17 C106,19 102,25 100,28
             C98,25 94,19 86,17 C76,14 66,18 58,28 Z"
          fill="#3D2010"
          opacity="0.6"
        />
        {/* Highlight streak */}
        <path
          d="M72,30 C76,22 88,18 100,20 C96,17 84,16 72,30 Z"
          fill="#5C3820"
          opacity="0.38"
        />

        {/* ── Bun ── */}
        <ellipse cx="100" cy="21" rx="22" ry="15" fill="url(#av-hair)" />
        <ellipse cx="100" cy="21" rx="18" ry="12" fill="#2C1208" />
        <path
          d="M83,19 C90,15 100,14 117,17 C106,14 92,14 83,19 Z"
          fill="#4A2A12"
          opacity="0.5"
        />
        <path
          d="M85,24 C92,21 100,20 115,22 C104,20 90,20 85,24 Z"
          fill="#4A2A12"
          opacity="0.35"
        />

        {/* ── Hair sides ── */}
        <path
          d="M42,65 C38,86 38,108 42,120 C40,104 40,84 42,65 Z"
          fill="url(#av-hair)"
        />
        <path
          d="M158,65 C162,86 162,108 158,120 C160,104 160,84 158,65 Z"
          fill="url(#av-hair)"
        />
        <path d="M49,72 C47,96 49,116 53,130 C51,113 51,92 53,74 Z" fill="#221008" />
        <path d="M151,72 C153,96 151,116 147,130 C149,113 149,92 147,74 Z" fill="#221008" />

        {/* ── Eyebrows ── */}
        <path
          d="M61,87 C67,82 76,80 85,82"
          stroke="#1A0A03"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M62,87 C68,83 76,81 84,83"
          stroke="#3D2010"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M115,82 C124,80 133,82 139,87"
          stroke="#1A0A03"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M116,83 C124,81 132,83 138,87"
          stroke="#3D2010"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />

        {/* ── Left eye ── */}
        {blinking ? (
          <>
            <path
              d="M63,95 C68,100 84,100 89,95"
              stroke="#1A0A03"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M64,95 C69,98 83,98 88,95"
              stroke="#C08060"
              strokeWidth="0.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.3"
            />
          </>
        ) : (
          <>
            <ellipse cx="76" cy="97" rx="13" ry="9.5" fill="white" />
            <circle cx="76" cy="98" r="7" fill="url(#av-iris-l)" />
            <circle cx="76" cy="98" r="3.5" fill="#0A0503" />
            <circle cx="79.5" cy="95" r="2.1" fill="white" opacity="0.95" />
            <circle cx="73.8" cy="100.5" r="0.9" fill="white" opacity="0.4" />
            <path
              d="M62,91 C67,84 85,84 90,91"
              stroke="#1A0A03"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M63,103 C67,107 85,107 89,103"
              stroke="#1A0A03"
              strokeWidth="0.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.28"
            />
          </>
        )}

        {/* ── Right eye ── */}
        {blinking ? (
          <>
            <path
              d="M111,95 C116,100 132,100 137,95"
              stroke="#1A0A03"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M112,95 C117,98 131,98 136,95"
              stroke="#C08060"
              strokeWidth="0.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.3"
            />
          </>
        ) : (
          <>
            <ellipse cx="124" cy="97" rx="13" ry="9.5" fill="white" />
            <circle cx="124" cy="98" r="7" fill="url(#av-iris-r)" />
            <circle cx="124" cy="98" r="3.5" fill="#0A0503" />
            <circle cx="127.5" cy="95" r="2.1" fill="white" opacity="0.95" />
            <circle cx="121.8" cy="100.5" r="0.9" fill="white" opacity="0.4" />
            <path
              d="M110,91 C115,84 133,84 138,91"
              stroke="#1A0A03"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M111,103 C115,107 133,107 137,103"
              stroke="#1A0A03"
              strokeWidth="0.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.28"
            />
          </>
        )}

        {/* ── Nose ── */}
        <path
          d="M97,104 C96,112 94,117 93,120 C96,124 104,124 107,120
             C106,117 104,112 103,104"
          stroke="#C07850"
          strokeWidth="1.1"
          fill="none"
          opacity="0.42"
        />
        <ellipse cx="93.5" cy="121" rx="3.5" ry="2.1" fill="#C07850" opacity="0.3" />
        <ellipse cx="106.5" cy="121" rx="3.5" ry="2.1" fill="#C07850" opacity="0.3" />

        {/* ── Blush ── */}
        <ellipse cx="62" cy="117" rx="14" ry="9" fill="url(#av-blush-l)" />
        <ellipse cx="138" cy="117" rx="14" ry="9" fill="url(#av-blush-r)" />

        {/* ── Mouth ── */}
        {mouthOpen ? (
          <g>
            <path
              d="M85,134 C90,129 110,129 115,134 C113,143 108,148 100,149
                 C92,148 87,143 85,134 Z"
              fill="#B84E70"
            />
            <path
              d="M87,136 C91,131 109,131 113,136 L113,141
                 C109,144 106,147 100,148 C94,147 91,144 87,141 Z"
              fill="#1C0408"
            />
            {/* Teeth */}
            <path
              d="M89,136 C93,133 107,133 111,136 L111,140
                 C107,137 93,137 89,140 Z"
              fill="white"
              opacity="0.93"
            />
            <line
              x1="100" y1="133" x2="100" y2="140"
              stroke="#E0DFDF"
              strokeWidth="0.5"
              opacity="0.35"
            />
            <path
              d="M85,134 C90,130 95,129 100,131 C105,129 110,130 115,134"
              stroke="#D4608A"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ) : (
          <g>
            <path
              d="M85,134 C90,130 95,129 100,130 C105,129 110,130 115,134"
              stroke="#C4607A"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M85,134 C90,138 95,140 100,140 C105,140 110,138 115,134"
              fill="#D4708A"
              opacity="0.58"
            />
            <path
              d="M85,134 C83,135 82,136 83,137"
              stroke="#B05068"
              strokeWidth="1.1"
              strokeLinecap="round"
              fill="none"
              opacity="0.42"
            />
            <path
              d="M115,134 C117,135 118,136 117,137"
              stroke="#B05068"
              strokeWidth="1.1"
              strokeLinecap="round"
              fill="none"
              opacity="0.42"
            />
          </g>
        )}

        {/* ── Subtle highlights ── */}
        <ellipse cx="100" cy="68" rx="20" ry="9" fill="#FCEEE0" opacity="0.11" />
        <ellipse cx="100" cy="160" rx="12" ry="5" fill="#FCEBD0" opacity="0.16" />
        <ellipse cx="100" cy="110" rx="4" ry="7" fill="#FCDCBD" opacity="0.16" />

        {/* ── Speaking border ── */}
        {isSpeaking && (
          <ellipse
            cx="100"
            cy="108"
            rx="59"
            ry="69"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            opacity="0.35"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Label */}
      <div className="mt-1 text-center">
        <p
          className="text-sm font-bold text-white/90"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Alex
        </p>
        {isSpeaking ? (
          <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--primary)] animate-pulse mt-0.5">
            Speaking
          </p>
        ) : (
          <p className="text-[9px] text-white/30 mt-0.5 tracking-wider uppercase">
            AI Interviewer
          </p>
        )}
      </div>
    </div>
  );
}
