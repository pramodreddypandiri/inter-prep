/**
 * Pure utility functions for the elevator pitch feature.
 * Keeping business logic here (outside React) makes it easy to unit-test.
 */

/** Maximum allowed recording duration in seconds. */
export const MAX_RECORDING_SECONDS = 60;

/** Target word-per-minute rate for a spoken pitch. */
export const WORDS_PER_MINUTE = 130;

/**
 * Estimate how many seconds a pitch will take when spoken at a normal pace.
 * Returns 0 for empty strings.
 */
export function estimatePitchDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.round((words / WORDS_PER_MINUTE) * 60);
}

/**
 * Return a CSS color token string for a given 0-100 score.
 * Uses semantic color names matching the app's CSS variables so callers
 * can pass this into `style={{ color }}` directly.
 */
export function scoreToColor(score: number | null): string {
  if (score === null) return "var(--muted)";
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--accent)";
  if (score >= 40) return "#f59e0b";
  return "var(--danger)";
}

/**
 * Return a human-readable label for a score band.
 */
export function scoreLabel(score: number | null): string {
  if (score === null) return "Not scored";
  if (score >= 85) return "Exceptional";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Solid";
  if (score >= 40) return "Developing";
  return "Needs Work";
}

/**
 * Sum up all dimension scores from a PitchFeedback dimensions object.
 * Useful for validating that the AI returned a correct total.
 */
export function sumDimensions(dimensions: Record<string, number>): number {
  return Object.values(dimensions).reduce((acc, v) => acc + v, 0);
}

/**
 * Format a duration in seconds as a human-readable string.
 * Examples: "45s", "1m 5s"
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Build the public share URL for a recording.
 * Falls back gracefully when `window` is not available (SSR).
 */
export function buildShareUrl(shareToken: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/share/pitch/${shareToken}`;
}

/**
 * Check whether the browser supports the MediaRecorder API needed for recording.
 */
export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined"
  );
}

/**
 * Determine the best supported MIME type for video recording.
 * Prefers vp9+opus webm, falls back to basic webm, then mp4.
 */
export function getBestMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "video/webm";
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

/**
 * Check whether the Web Speech API (SpeechRecognition) is available.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );
}
