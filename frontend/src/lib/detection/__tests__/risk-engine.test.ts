import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RiskEngine } from "../risk-engine";
import type { GazeSignal, AudioSignal, TimingSignal } from "../types";

// Mock document.addEventListener for tab switch tracking
const listeners: Record<string, Function[]> = {};
vi.stubGlobal("document", {
  ...document,
  hidden: false,
  addEventListener: (event: string, fn: Function) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  removeEventListener: (event: string, fn: Function) => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((f) => f !== fn);
    }
  },
});

function fireVisibilityChange(hidden: boolean) {
  (document as any).hidden = hidden;
  (listeners["visibilitychange"] || []).forEach((fn) => fn());
}

describe("RiskEngine", () => {
  let engine: RiskEngine;

  beforeEach(() => {
    engine = new RiskEngine();
  });

  afterEach(() => {
    engine.destroy();
  });

  // ── Initial state ────────────────────────────────────────────────

  describe("initial state", () => {
    it("starts with zero risk score", () => {
      expect(engine.getCurrentScore()).toBe(0);
    });

    it("starts with empty stats", () => {
      const stats = engine.getStats();
      expect(stats.totalLookAways).toBe(0);
      expect(stats.readingPatterns).toBe(0);
      expect(stats.tabSwitchCount).toBe(0);
      expect(stats.typingDetections).toBe(0);
      expect(stats.secondSpeakerDetections).toBe(0);
      expect(stats.suspiciousEvents).toHaveLength(0);
    });

    it("starts with empty timeline", () => {
      expect(engine.getTimeline()).toHaveLength(0);
    });
  });

  // ── Gaze signals ─────────────────────────────────────────────────

  describe("updateGaze", () => {
    it("increases risk when entropy is low (reading pattern)", () => {
      const signal: GazeSignal = {
        entropy: 0.1, // very low = reading
        saccadeRate: 2,
        gazeAngleOffset: 5,
        readingPatternDetected: true,
        timestamp: Date.now(),
      };

      engine.updateGaze(signal);
      expect(engine.getCurrentScore()).toBeGreaterThan(0);
    });

    it("records look-away when gaze offset > 15", () => {
      engine.updateGaze({
        entropy: 0.8,
        saccadeRate: 1,
        gazeAngleOffset: 20,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });

      const stats = engine.getStats();
      expect(stats.totalLookAways).toBe(1);
    });

    it("does NOT record look-away when gaze offset <= 15", () => {
      engine.updateGaze({
        entropy: 0.8,
        saccadeRate: 1,
        gazeAngleOffset: 10,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });

      expect(engine.getStats().totalLookAways).toBe(0);
    });

    it("increments reading patterns count", () => {
      engine.updateGaze({
        entropy: 0.2,
        saccadeRate: 3,
        gazeAngleOffset: 5,
        readingPatternDetected: true,
        timestamp: Date.now(),
      });
      engine.updateGaze({
        entropy: 0.15,
        saccadeRate: 3,
        gazeAngleOffset: 5,
        readingPatternDetected: true,
        timestamp: Date.now() + 1000,
      });

      expect(engine.getStats().readingPatterns).toBe(2);
    });

    it("tracks average gaze offset", () => {
      engine.updateGaze({
        entropy: 0.8,
        saccadeRate: 1,
        gazeAngleOffset: 10,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });
      engine.updateGaze({
        entropy: 0.8,
        saccadeRate: 1,
        gazeAngleOffset: 20,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });

      expect(engine.getStats().avgGazeOffset).toBe(15);
    });

    it("adds suspicious event for reading pattern", () => {
      engine.updateGaze({
        entropy: 0.2,
        saccadeRate: 3,
        gazeAngleOffset: 5,
        readingPatternDetected: true,
        timestamp: Date.now(),
      });

      const events = engine.getStats().suspiciousEvents;
      expect(events.some((e) => e.type === "reading_pattern")).toBe(true);
    });

    it("adds suspicious event for look-away", () => {
      engine.updateGaze({
        entropy: 0.8,
        saccadeRate: 1,
        gazeAngleOffset: 25,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });

      const events = engine.getStats().suspiciousEvents;
      expect(events.some((e) => e.type === "look_away")).toBe(true);
    });
  });

  // ── Timing signals ───────────────────────────────────────────────

  describe("updateTiming", () => {
    it("increases risk for very fast onset (<500ms)", () => {
      engine.updateTiming({
        onsetDelayMs: 300,
        disfluencyCount: 0,
        fluencyScore: 1.0,
        timestamp: Date.now(),
      });

      expect(engine.getCurrentScore()).toBeGreaterThan(0);
    });

    it("flags suspiciously fluent speech", () => {
      engine.updateTiming({
        onsetDelayMs: 2000,
        disfluencyCount: 0,
        fluencyScore: 0.9,
        timestamp: Date.now(),
      });

      const timeline = engine.getTimeline();
      const latest = timeline[timeline.length - 1];
      expect(latest.flags).toContain("Suspiciously fluent speech");
    });

    it("no onset flag for normal delay (>1200ms)", () => {
      engine.updateTiming({
        onsetDelayMs: 3000,
        disfluencyCount: 2,
        fluencyScore: 0.0,
        timestamp: Date.now(),
      });

      const timeline = engine.getTimeline();
      const latest = timeline[timeline.length - 1];
      expect(latest.breakdown.onsetDelay).toBe(0);
    });
  });

  // ── Audio signals ────────────────────────────────────────────────

  describe("updateAudio", () => {
    it("detects typing and increments counter", () => {
      engine.updateAudio({
        pitchVariance: 100,
        typingDetected: true,
        secondSpeakerDetected: false,
        timestamp: Date.now(),
      });

      expect(engine.getStats().typingDetections).toBe(1);
    });

    it("detects second speaker and increments counter", () => {
      engine.updateAudio({
        pitchVariance: 100,
        typingDetected: false,
        secondSpeakerDetected: true,
        timestamp: Date.now(),
      });

      expect(engine.getStats().secondSpeakerDetections).toBe(1);
    });

    it("adds suspicious events for typing", () => {
      engine.updateAudio({
        pitchVariance: 100,
        typingDetected: true,
        secondSpeakerDetected: false,
        timestamp: Date.now(),
      });

      const events = engine.getStats().suspiciousEvents;
      expect(events.some((e) => e.type === "typing_detected")).toBe(true);
    });

    it("adds suspicious events for second speaker", () => {
      engine.updateAudio({
        pitchVariance: 100,
        typingDetected: false,
        secondSpeakerDetected: true,
        timestamp: Date.now(),
      });

      const events = engine.getStats().suspiciousEvents;
      expect(events.some((e) => e.type === "second_speaker")).toBe(true);
    });
  });

  // ── Tab switches ─────────────────────────────────────────────────

  describe("tab switches", () => {
    it("tracks tab switch count", () => {
      fireVisibilityChange(true); // tab hidden
      fireVisibilityChange(false); // tab visible (not counted)
      fireVisibilityChange(true); // tab hidden again

      expect(engine.getStats().tabSwitchCount).toBe(2);
    });

    it("adds suspicious event for tab switch", () => {
      fireVisibilityChange(true);

      const events = engine.getStats().suspiciousEvents;
      expect(events.some((e) => e.type === "tab_switch")).toBe(true);
    });

    it("tab switch contributes to risk score", () => {
      fireVisibilityChange(true);
      // Need to trigger a recompute by sending any signal
      engine.updateTiming({
        onsetDelayMs: 2000,
        disfluencyCount: 1,
        fluencyScore: 0,
        timestamp: Date.now(),
      });

      const timeline = engine.getTimeline();
      const latest = timeline[timeline.length - 1];
      expect(latest.breakdown.tabSwitches).toBe(25); // 1 switch * 25
    });
  });

  // ── Score computation ────────────────────────────────────────────

  describe("score computation", () => {
    it("score is clamped between 0 and 100", () => {
      // Max everything out
      engine.updateGaze({
        entropy: 0.0,
        saccadeRate: 10,
        gazeAngleOffset: 30,
        readingPatternDetected: true,
        timestamp: Date.now(),
      });
      engine.updateTiming({
        onsetDelayMs: 100,
        disfluencyCount: 0,
        fluencyScore: 1.0,
        timestamp: Date.now(),
      });
      engine.updateAudio({
        pitchVariance: 0,
        typingDetected: true,
        secondSpeakerDetected: true,
        timestamp: Date.now(),
      });

      expect(engine.getCurrentScore()).toBeLessThanOrEqual(100);
      expect(engine.getCurrentScore()).toBeGreaterThanOrEqual(0);
    });

    it("clean signals produce low risk", () => {
      engine.updateGaze({
        entropy: 0.9, // high entropy = natural
        saccadeRate: 1,
        gazeAngleOffset: 3,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });
      engine.updateTiming({
        onsetDelayMs: 3000, // normal thinking time
        disfluencyCount: 2,
        fluencyScore: 0.0, // natural
        timestamp: Date.now(),
      });
      engine.updateAudio({
        pitchVariance: 200,
        typingDetected: false,
        secondSpeakerDetected: false,
        timestamp: Date.now(),
      });

      expect(engine.getCurrentScore()).toBeLessThan(15);
    });

    it("all-suspicious signals produce high risk", () => {
      engine.updateGaze({
        entropy: 0.05,
        saccadeRate: 8,
        gazeAngleOffset: 25,
        readingPatternDetected: true,
        timestamp: Date.now(),
      });
      engine.updateTiming({
        onsetDelayMs: 200,
        disfluencyCount: 0,
        fluencyScore: 1.0,
        timestamp: Date.now(),
      });
      engine.updateAudio({
        pitchVariance: 5,
        typingDetected: true,
        secondSpeakerDetected: true,
        timestamp: Date.now(),
      });

      expect(engine.getCurrentScore()).toBeGreaterThan(70);
    });

    it("timeline grows with each signal update", () => {
      engine.updateGaze({
        entropy: 0.5,
        saccadeRate: 1,
        gazeAngleOffset: 5,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });
      engine.updateTiming({
        onsetDelayMs: 2000,
        disfluencyCount: 1,
        fluencyScore: 0.5,
        timestamp: Date.now(),
      });
      engine.updateAudio({
        pitchVariance: 100,
        typingDetected: false,
        secondSpeakerDetected: false,
        timestamp: Date.now(),
      });

      expect(engine.getTimeline()).toHaveLength(3);
    });
  });

  // ── Snapshot breakdown ───────────────────────────────────────────

  describe("snapshot breakdown", () => {
    it("has all expected breakdown keys", () => {
      engine.updateGaze({
        entropy: 0.5,
        saccadeRate: 1,
        gazeAngleOffset: 5,
        readingPatternDetected: false,
        timestamp: Date.now(),
      });

      const timeline = engine.getTimeline();
      const snapshot = timeline[0];
      const keys = Object.keys(snapshot.breakdown);
      expect(keys).toContain("gazeEntropy");
      expect(keys).toContain("readingPattern");
      expect(keys).toContain("onsetDelay");
      expect(keys).toContain("fluencyScore");
      expect(keys).toContain("tabSwitches");
      expect(keys).toContain("typingDetected");
      expect(keys).toContain("secondSpeaker");
    });

    it("breakdown values are 0-100", () => {
      engine.updateGaze({
        entropy: 0.1,
        saccadeRate: 5,
        gazeAngleOffset: 10,
        readingPatternDetected: true,
        timestamp: Date.now(),
      });

      const snapshot = engine.getTimeline()[0];
      for (const val of Object.values(snapshot.breakdown)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── getStats returns a copy ──────────────────────────────────────

  describe("getStats isolation", () => {
    it("returns a copy, not a reference", () => {
      const stats1 = engine.getStats();
      engine.updateGaze({
        entropy: 0.1,
        saccadeRate: 2,
        gazeAngleOffset: 20,
        readingPatternDetected: true,
        timestamp: Date.now(),
      });
      const stats2 = engine.getStats();

      expect(stats1.readingPatterns).toBe(0);
      expect(stats2.readingPatterns).toBe(1);
    });
  });

  // ── destroy ──────────────────────────────────────────────────────

  describe("destroy", () => {
    it("removes visibilitychange listener", () => {
      const initialCount = (listeners["visibilitychange"] || []).length;
      engine.destroy();
      const afterCount = (listeners["visibilitychange"] || []).length;
      expect(afterCount).toBeLessThan(initialCount);
    });
  });
});
