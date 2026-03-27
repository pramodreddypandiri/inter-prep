"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Camera, AlertTriangle, Eye } from "lucide-react";
import { GazeAnalyzer } from "@/lib/detection/gaze-analyzer";
import { AudioAnalyzer } from "@/lib/detection/audio-analyzer";
import { RiskEngine } from "@/lib/detection/risk-engine";
import type {
  GazeSignal,
  AudioSignal,
  IntegrityStats,
} from "@/lib/detection/types";

export type { IntegrityStats };

export interface EyeTrackerRef {
  getStats: () => IntegrityStats;
  getRiskScore: () => number;
  getMediaStream: () => MediaStream | null;
}

interface EyeTrackerProps {
  autoStart?: boolean;
  onWarning?: (message: string) => void;
  onGazeSignal?: (signal: GazeSignal) => void;
  onAudioSignal?: (signal: AudioSignal) => void;
  onRiskUpdate?: (score: number) => void;
}

const EyeTracker = forwardRef<EyeTrackerRef, EyeTrackerProps>(
  ({ autoStart = true, onWarning, onGazeSignal, onAudioSignal, onRiskUpdate }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [initStatus, setInitStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
    const streamRef = useRef<MediaStream | null>(null);

    // Detection modules
    const gazeAnalyzerRef = useRef<GazeAnalyzer | null>(null);
    const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
    const riskEngineRef = useRef<RiskEngine>(new RiskEngine());

    // For fallback tracking when FaceMesh fails to load
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevPositionsRef = useRef<{ x: number; brightness: number }[]>([]);
    const consecutiveMovementRef = useRef(0);
    const fallbackStatsRef = useRef({ totalLookAways: 0, readingPatterns: 0 });

    useImperativeHandle(ref, () => ({
      getStats: () => riskEngineRef.current.getStats(),
      getRiskScore: () => riskEngineRef.current.getCurrentScore(),
      getMediaStream: () => streamRef.current,
    }));

    const showWarning = useCallback(
      (msg: string) => {
        setWarning(msg);
        onWarning?.(msg);
        setTimeout(() => setWarning(""), 3000);
      },
      [onWarning]
    );

    // Gaze signal handler
    const handleGazeSignal = useCallback(
      (signal: GazeSignal) => {
        riskEngineRef.current.updateGaze(signal);
        onGazeSignal?.(signal);
        onRiskUpdate?.(riskEngineRef.current.getCurrentScore());

        if (signal.readingPatternDetected) {
          showWarning("Reading pattern detected — eyes scanning horizontally");
        } else if (signal.gazeAngleOffset > 15) {
          showWarning("Please look at the camera");
        } else if (signal.entropy < 0.25) {
          showWarning("Unusual gaze pattern detected");
        }
      },
      [onGazeSignal, onRiskUpdate, showWarning]
    );

    // Audio signal handler
    const handleAudioSignal = useCallback(
      (signal: AudioSignal) => {
        riskEngineRef.current.updateAudio(signal);
        onAudioSignal?.(signal);
        onRiskUpdate?.(riskEngineRef.current.getCurrentScore());

        if (signal.typingDetected) {
          showWarning("Keyboard typing detected");
        } else if (signal.secondSpeakerDetected) {
          showWarning("Additional voice detected in background");
        }
      },
      [onAudioSignal, onRiskUpdate, showWarning]
    );

    // Fallback frame analysis (brightness-based, used when FaceMesh unavailable)
    const analyzeFallbackFrame = useCallback(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 240;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);

      const regions = [
        { x: 80, y: 30, w: 160, h: 120, label: "center" },
        { x: 20, y: 60, w: 60, h: 80, label: "left" },
        { x: 240, y: 60, w: 60, h: 80, label: "right" },
      ];

      const brightnesses: Record<string, number> = {};
      for (const region of regions) {
        const imgData = ctx.getImageData(region.x, region.y, region.w, region.h);
        let total = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          total += (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
        }
        brightnesses[region.label] = total / (region.w * region.h);
      }

      const facePresent = brightnesses["center"] > 40;
      if (!facePresent) {
        fallbackStatsRef.current.totalLookAways++;
        riskEngineRef.current.updateGaze({
          entropy: 1,
          saccadeRate: 0,
          gazeAngleOffset: 25,
          readingPatternDetected: false,
          timestamp: Date.now(),
        });
        if (fallbackStatsRef.current.totalLookAways % 3 === 0) {
          showWarning("Please look at the camera");
        }
        return;
      }

      const leftBias = brightnesses["left"] - brightnesses["right"];
      const currentPos = { x: leftBias, brightness: brightnesses["center"] };
      const prev = prevPositionsRef.current;
      prev.push(currentPos);
      if (prev.length > 10) prev.shift();

      if (prev.length >= 6) {
        const recentX = prev.slice(-6).map((p) => p.x);
        let dirChanges = 0;
        for (let i = 2; i < recentX.length; i++) {
          const prevDiff = recentX[i - 1] - recentX[i - 2];
          const currDiff = recentX[i] - recentX[i - 1];
          if (Math.abs(currDiff) > 2) consecutiveMovementRef.current++;
          else consecutiveMovementRef.current = 0;
          if (prevDiff * currDiff < 0) dirChanges++;
        }
        if (consecutiveMovementRef.current >= 4 && dirChanges >= 2) {
          fallbackStatsRef.current.readingPatterns++;
          consecutiveMovementRef.current = 0;
          riskEngineRef.current.updateGaze({
            entropy: 0.2,
            saccadeRate: 3,
            gazeAngleOffset: 5,
            readingPatternDetected: true,
            timestamp: Date.now(),
          });
          showWarning("Excessive eye movement detected — possible screen reading");
        }
      }
    }, [showWarning]);

    const startCamera = useCallback(async () => {
      setError("");
      setInitStatus("loading");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsActive(true);

        // Start audio analyzer
        const audioAnalyzer = new AudioAnalyzer();
        audioAnalyzerRef.current = audioAnalyzer;
        audioAnalyzer.start(stream, handleAudioSignal);

        // Initialize and start gaze analyzer
        try {
          const gazeAnalyzer = new GazeAnalyzer();
          await gazeAnalyzer.initialize();
          gazeAnalyzerRef.current = gazeAnalyzer;

          if (videoRef.current) {
            gazeAnalyzer.start(videoRef.current, handleGazeSignal);
          }
          setInitStatus("ready");
        } catch {
          // FaceMesh unavailable (e.g. no GPU, WASM blocked) — use fallback
          console.warn("MediaPipe FaceMesh unavailable, using fallback tracking");
          setInitStatus("fallback");
          fallbackIntervalRef.current = setInterval(analyzeFallbackFrame, 500);
        }
      } catch {
        setError("Camera access denied.");
        setInitStatus("idle");
      }
    }, [handleGazeSignal, handleAudioSignal, analyzeFallbackFrame]);

    const stopCamera = useCallback(() => {
      gazeAnalyzerRef.current?.destroy();
      gazeAnalyzerRef.current = null;
      audioAnalyzerRef.current?.stop();
      audioAnalyzerRef.current = null;

      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsActive(false);
    }, []);

    useEffect(() => {
      if (autoStart) startCamera();
      return () => {
        stopCamera();
        riskEngineRef.current.destroy();
      };
    }, [autoStart, startCamera, stopCamera]);

    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isActive ? "" : "hidden"}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!isActive && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)]">
              <button
                onClick={startCamera}
                className="flex flex-col items-center gap-2 text-xs"
              >
                <Camera size={24} />
                Enable Camera
              </button>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-3">
              <p className="text-xs text-[var(--danger)] text-center">
                {error}
              </p>
            </div>
          )}

          {/* Warning overlay */}
          {warning && (
            <div className="absolute bottom-0 left-0 right-0 bg-yellow-500/90 text-black text-xs px-3 py-2 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {warning}
            </div>
          )}

          {/* Tracking indicator */}
          {isActive && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <Eye size={10} className="text-green-400" />
              <span className="text-[10px] text-green-400 font-medium">
                {initStatus === "ready"
                  ? "FaceMesh Active"
                  : initStatus === "fallback"
                  ? "Tracking"
                  : "Initializing..."}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

EyeTracker.displayName = "EyeTracker";
export default EyeTracker;
