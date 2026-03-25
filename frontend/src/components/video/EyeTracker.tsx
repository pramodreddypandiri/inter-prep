"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Camera, AlertTriangle, Eye, EyeOff } from "lucide-react";

export interface EyeTrackingStats {
  totalLookAways: number;
  readingPatterns: number;
  avgFacePosition: { x: number; y: number };
  suspiciousEvents: { timestamp: number; type: string; duration?: number }[];
}

export interface EyeTrackerRef {
  getStats: () => EyeTrackingStats;
}

interface EyeTrackerProps {
  autoStart?: boolean;
  onWarning?: (message: string) => void;
}

const EyeTracker = forwardRef<EyeTrackerRef, EyeTrackerProps>(
  ({ autoStart = true, onWarning }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Tracking state
    const statsRef = useRef<EyeTrackingStats>({
      totalLookAways: 0,
      readingPatterns: 0,
      avgFacePosition: { x: 0, y: 0 },
      suspiciousEvents: [],
    });
    const prevPositionsRef = useRef<{ x: number; y: number; brightness: number }[]>([]);
    const consecutiveMovementRef = useRef(0);

    useImperativeHandle(ref, () => ({
      getStats: () => ({ ...statsRef.current }),
    }));

    const showWarning = useCallback(
      (msg: string) => {
        setWarning(msg);
        onWarning?.(msg);
        setTimeout(() => setWarning(""), 3000);
      },
      [onWarning]
    );

    const analyzeFrame = useCallback(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 240;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);

      // Analyze face region (upper-center of frame)
      const regions = [
        { x: 80, y: 30, w: 160, h: 120, label: "center" }, // face center
        { x: 20, y: 60, w: 60, h: 80, label: "left" }, // left side
        { x: 240, y: 60, w: 60, h: 80, label: "right" }, // right side
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

      // Detect face presence (center should be brighter than edges in normal position)
      const centerBrightness = brightnesses["center"];
      const facePresent = centerBrightness > 40;

      if (!facePresent) {
        statsRef.current.totalLookAways++;
        statsRef.current.suspiciousEvents.push({
          timestamp: Date.now(),
          type: "look_away",
        });
        if (statsRef.current.totalLookAways % 3 === 0) {
          showWarning("Please look at the camera");
        }
        return;
      }

      // Detect lateral movement (reading pattern = consistent left-to-right scanning)
      // Compare brightness distribution shifts between frames
      const leftBias = brightnesses["left"] - brightnesses["right"];
      const currentPos = {
        x: leftBias,
        y: centerBrightness,
        brightness: centerBrightness,
      };

      const prev = prevPositionsRef.current;
      prev.push(currentPos);
      if (prev.length > 10) prev.shift();

      // Detect reading pattern: consistent horizontal scanning
      if (prev.length >= 6) {
        const recentXPositions = prev.slice(-6).map((p) => p.x);
        let directionChanges = 0;
        let isScanning = true;

        for (let i = 1; i < recentXPositions.length; i++) {
          const diff = recentXPositions[i] - recentXPositions[i - 1];
          if (Math.abs(diff) > 2) {
            // Significant horizontal movement
            consecutiveMovementRef.current++;
          } else {
            consecutiveMovementRef.current = 0;
          }

          if (i > 1) {
            const prevDiff = recentXPositions[i - 1] - recentXPositions[i - 2];
            if (prevDiff * diff < 0) directionChanges++;
          }
        }

        // Reading pattern: lots of horizontal movement with direction changes
        // (eyes scan left-right across screen)
        if (consecutiveMovementRef.current >= 4 && directionChanges >= 2) {
          statsRef.current.readingPatterns++;
          statsRef.current.suspiciousEvents.push({
            timestamp: Date.now(),
            type: "reading_pattern",
          });
          consecutiveMovementRef.current = 0;
          showWarning("Excessive eye movement detected — possible screen reading");
        }
      }
    }, [showWarning]);

    const startCamera = useCallback(async () => {
      setError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsActive(true);

        // Start eye tracking analysis
        intervalRef.current = setInterval(analyzeFrame, 500);
      } catch {
        setError("Camera access denied.");
      }
    }, [analyzeFrame]);

    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsActive(false);
    }, []);

    useEffect(() => {
      if (autoStart) {
        startCamera();
      }
      return () => stopCamera();
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
              <p className="text-xs text-[var(--danger)] text-center">{error}</p>
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
                Tracking
              </span>
            </div>
          )}
        </div>

        {isActive && (
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Eye size={10} />
              Look-aways: {statsRef.current.totalLookAways}
            </span>
            <span
              className={
                statsRef.current.readingPatterns > 2
                  ? "text-[var(--danger)] font-medium"
                  : ""
              }
            >
              Suspicious: {statsRef.current.readingPatterns}
            </span>
          </div>
        )}
      </div>
    );
  }
);

EyeTracker.displayName = "EyeTracker";
export default EyeTracker;
