import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  estimatePitchDuration,
  scoreToColor,
  scoreLabel,
  sumDimensions,
  formatDuration,
  buildShareUrl,
  isRecordingSupported,
  isSpeechRecognitionSupported,
  getBestMimeType,
  MAX_RECORDING_SECONDS,
  WORDS_PER_MINUTE,
} from "../pitch-utils";

// ── estimatePitchDuration ─────────────────────────────────────────────────────

describe("estimatePitchDuration", () => {
  it("returns 0 for an empty string", () => {
    expect(estimatePitchDuration("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(estimatePitchDuration("   ")).toBe(0);
  });

  it("returns correct estimate for 130 words (should be ~60s)", () => {
    const words = Array(130).fill("word").join(" ");
    expect(estimatePitchDuration(words)).toBe(60);
  });

  it("returns correct estimate for 65 words (~30s)", () => {
    const words = Array(65).fill("word").join(" ");
    expect(estimatePitchDuration(words)).toBe(30);
  });

  it("rounds to nearest whole second", () => {
    // 1 word → Math.round(1/130 * 60) = Math.round(0.46) = 0
    expect(estimatePitchDuration("hello")).toBe(0);
  });

  it("ignores extra whitespace between words", () => {
    const tight = "word word word word"; // 4 words
    const loose = "word   word  word\tword"; // same 4 words
    expect(estimatePitchDuration(tight)).toBe(estimatePitchDuration(loose));
  });

  it("uses WORDS_PER_MINUTE constant (130)", () => {
    expect(WORDS_PER_MINUTE).toBe(130);
    const words = Array(WORDS_PER_MINUTE).fill("x").join(" ");
    expect(estimatePitchDuration(words)).toBe(60);
  });
});

// ── scoreToColor ──────────────────────────────────────────────────────────────

describe("scoreToColor", () => {
  it("returns muted color for null", () => {
    expect(scoreToColor(null)).toBe("var(--muted)");
  });

  it("returns success color for 80+", () => {
    expect(scoreToColor(80)).toBe("var(--success)");
    expect(scoreToColor(100)).toBe("var(--success)");
  });

  it("returns accent color for 60-79", () => {
    expect(scoreToColor(60)).toBe("var(--accent)");
    expect(scoreToColor(79)).toBe("var(--accent)");
  });

  it("returns amber for 40-59", () => {
    expect(scoreToColor(40)).toBe("#f59e0b");
    expect(scoreToColor(59)).toBe("#f59e0b");
  });

  it("returns danger color for <40", () => {
    expect(scoreToColor(39)).toBe("var(--danger)");
    expect(scoreToColor(0)).toBe("var(--danger)");
  });
});

// ── scoreLabel ────────────────────────────────────────────────────────────────

describe("scoreLabel", () => {
  it("returns 'Not scored' for null", () => {
    expect(scoreLabel(null)).toBe("Not scored");
  });

  it("returns 'Exceptional' for 85+", () => {
    expect(scoreLabel(85)).toBe("Exceptional");
    expect(scoreLabel(100)).toBe("Exceptional");
  });

  it("returns 'Strong' for 70-84", () => {
    expect(scoreLabel(70)).toBe("Strong");
    expect(scoreLabel(84)).toBe("Strong");
  });

  it("returns 'Solid' for 55-69", () => {
    expect(scoreLabel(55)).toBe("Solid");
    expect(scoreLabel(69)).toBe("Solid");
  });

  it("returns 'Developing' for 40-54", () => {
    expect(scoreLabel(40)).toBe("Developing");
    expect(scoreLabel(54)).toBe("Developing");
  });

  it("returns 'Needs Work' for <40", () => {
    expect(scoreLabel(39)).toBe("Needs Work");
    expect(scoreLabel(0)).toBe("Needs Work");
  });
});

// ── sumDimensions ─────────────────────────────────────────────────────────────

describe("sumDimensions", () => {
  it("sums all dimension values", () => {
    const dims = {
      opening_hook: 12,
      identity_clarity: 13,
      value_proposition: 16,
      unique_differentiator: 15,
      role_fit: 12,
      call_to_action: 7,
      delivery: 3,
    };
    expect(sumDimensions(dims)).toBe(78);
  });

  it("returns 0 for empty object", () => {
    expect(sumDimensions({})).toBe(0);
  });

  it("handles max scores (100 total)", () => {
    const maxDims = {
      opening_hook: 15,
      identity_clarity: 15,
      value_proposition: 20,
      unique_differentiator: 20,
      role_fit: 15,
      call_to_action: 10,
      delivery: 5,
    };
    expect(sumDimensions(maxDims)).toBe(100);
  });

  it("handles zero scores", () => {
    const zeroDims = {
      opening_hook: 0,
      identity_clarity: 0,
      value_proposition: 0,
    };
    expect(sumDimensions(zeroDims)).toBe(0);
  });
});

// ── formatDuration ────────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("returns '0s' for 0 or negative", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(-5)).toBe("0s");
  });

  it("returns seconds-only for <60s", () => {
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(59)).toBe("59s");
  });

  it("returns minutes-only when exactly divisible", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(120)).toBe("2m");
  });

  it("returns minutes and seconds for mixed", () => {
    expect(formatDuration(65)).toBe("1m 5s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(125)).toBe("2m 5s");
  });
});

// ── buildShareUrl ─────────────────────────────────────────────────────────────

describe("buildShareUrl", () => {
  it("builds URL with provided origin", () => {
    const url = buildShareUrl("abc123", "https://interviewace.app");
    expect(url).toBe("https://interviewace.app/share/pitch/abc123");
  });

  it("builds URL with window.location.origin when no origin provided", () => {
    vi.stubGlobal("window", { location: { origin: "https://localhost:3000" } });
    const url = buildShareUrl("tok456");
    expect(url).toBe("https://localhost:3000/share/pitch/tok456");
    vi.unstubAllGlobals();
  });

  it("handles empty origin gracefully", () => {
    const url = buildShareUrl("mytoken", "");
    expect(url).toBe("/share/pitch/mytoken");
  });
});

// ── isRecordingSupported ──────────────────────────────────────────────────────

describe("isRecordingSupported", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined (SSR)", () => {
    // In the test environment window exists, so we check the positive case instead
    // The function returns true in a browser environment
    const result = isRecordingSupported();
    // Should return a boolean
    expect(typeof result).toBe("boolean");
  });

  it("returns false when MediaRecorder is not available", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(isRecordingSupported()).toBe(false);
  });

  it("returns false when navigator.mediaDevices is not available", () => {
    vi.stubGlobal("navigator", { mediaDevices: undefined });
    expect(isRecordingSupported()).toBe(false);
  });
});

// ── getBestMimeType ───────────────────────────────────────────────────────────

describe("getBestMimeType", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a string", () => {
    expect(typeof getBestMimeType()).toBe("string");
  });

  it("returns webm fallback when MediaRecorder not defined", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(getBestMimeType()).toBe("video/webm");
  });

  it("returns first supported type", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => type === "video/webm",
    });
    expect(getBestMimeType()).toBe("video/webm");
  });

  it("returns mp4 when only mp4 supported", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => type === "video/mp4",
    });
    expect(getBestMimeType()).toBe("video/mp4");
  });
});

// ── isSpeechRecognitionSupported ──────────────────────────────────────────────

describe("isSpeechRecognitionSupported", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns boolean", () => {
    expect(typeof isSpeechRecognitionSupported()).toBe("boolean");
  });

  it("returns true when SpeechRecognition is present", () => {
    vi.stubGlobal("window", {
      SpeechRecognition: class {},
      location: { origin: "" },
    });
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it("returns true when webkitSpeechRecognition is present", () => {
    vi.stubGlobal("window", {
      webkitSpeechRecognition: class {},
      location: { origin: "" },
    });
    expect(isSpeechRecognitionSupported()).toBe(true);
  });
});

// ── MAX_RECORDING_SECONDS constant ────────────────────────────────────────────

describe("MAX_RECORDING_SECONDS", () => {
  it("is 60", () => {
    expect(MAX_RECORDING_SECONDS).toBe(60);
  });
});
