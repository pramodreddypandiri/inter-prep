"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, AlertTriangle, Eye } from "lucide-react";

interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

export default function WebcamMonitor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState("");
  const [gazeWarning, setGazeWarning] = useState(false);
  const [gazeLog, setGazeLog] = useState<GazeData[]>([]);
  const [lookAwayCount, setLookAwayCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const gazeCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async () => {
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
      startGazeDetection();
    } catch (err) {
      setError("Camera access denied. Please allow camera access.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (gazeCheckInterval.current) {
      clearInterval(gazeCheckInterval.current);
      gazeCheckInterval.current = null;
    }
    setIsActive(false);
  };

  const startGazeDetection = () => {
    // Basic eye movement detection using canvas pixel analysis
    // This is a simplified version - in production, use WebGazer.js
    gazeCheckInterval.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 240;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);

      // Get center region (where face should be)
      const centerX = 160;
      const centerY = 100;
      const regionSize = 60;
      const imageData = ctx.getImageData(
        centerX - regionSize / 2,
        centerY - regionSize / 2,
        regionSize,
        regionSize
      );

      // Simple brightness analysis for face detection
      let totalBrightness = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        totalBrightness +=
          (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      }
      const avgBrightness = totalBrightness / (regionSize * regionSize);

      // If brightness is very low in center, user may be looking away
      const isLookingAway = avgBrightness < 30;

      if (isLookingAway) {
        setGazeWarning(true);
        setLookAwayCount((c) => c + 1);
        setTimeout(() => setGazeWarning(false), 2000);
      }

      setGazeLog((prev) => [
        ...prev.slice(-100), // Keep last 100 data points
        { x: centerX, y: centerY, timestamp: Date.now() },
      ]);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Eye size={14} />
          Webcam Monitor
        </h4>
        <button
          onClick={isActive ? stopCamera : startCamera}
          className={`p-1.5 rounded-lg text-xs ${
            isActive
              ? "bg-[var(--danger)] text-white"
              : "bg-[var(--primary)] text-white"
          }`}
        >
          {isActive ? <CameraOff size={12} /> : <Camera size={12} />}
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      )}

      <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isActive ? "" : "hidden"}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isActive && (
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

        {/* Gaze warning overlay */}
        {gazeWarning && (
          <div className="absolute top-2 left-2 right-2 bg-yellow-500/90 text-black text-xs rounded-md px-2 py-1 flex items-center gap-1">
            <AlertTriangle size={12} />
            Possible screen reading detected
          </div>
        )}
      </div>

      {isActive && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Look-away events:</span>
            <span
              className={
                lookAwayCount > 5
                  ? "text-[var(--danger)] font-medium"
                  : ""
              }
            >
              {lookAwayCount}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Monitoring posture and eye contact. Stay centered in frame.
          </p>
        </div>
      )}
    </div>
  );
}
