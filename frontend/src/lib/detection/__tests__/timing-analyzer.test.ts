import { describe, it, expect, beforeEach, vi } from "vitest";
import { TimingAnalyzer } from "../timing-analyzer";
import type { TimingSignal } from "../types";

describe("TimingAnalyzer", () => {
  let analyzer: TimingAnalyzer;
  let emittedSignals: TimingSignal[];

  beforeEach(() => {
    analyzer = new TimingAnalyzer();
    emittedSignals = [];
    analyzer.setOnSignal((signal) => emittedSignals.push(signal));
  });

  // ── Onset delay ──────────────────────────────────────────────────

  describe("onset delay", () => {
    it("measures delay between question and response start", () => {
      analyzer.markQuestionAsked();

      // Simulate 500ms delay
      const now = Date.now();
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now + 500) // markResponseStart
        .mockReturnValueOnce(now + 2000); // analyzeResponse

      analyzer.markResponseStart();
      analyzer.analyzeResponse("This is my answer to the question");

      expect(emittedSignals).toHaveLength(1);
      expect(emittedSignals[0].onsetDelayMs).toBeGreaterThanOrEqual(0);
    });

    it("onset delay is 0 when no question was marked", () => {
      analyzer.analyzeResponse("Some answer");

      expect(emittedSignals).toHaveLength(1);
      expect(emittedSignals[0].onsetDelayMs).toBe(0);
    });
  });

  // ── Disfluency detection ─────────────────────────────────────────

  describe("disfluency detection", () => {
    it("counts disfluency markers in response", () => {
      analyzer.analyzeResponse("Um, well, I think, um, that the answer is, like, related to REST");

      expect(emittedSignals).toHaveLength(1);
      expect(emittedSignals[0].disfluencyCount).toBeGreaterThan(0);
    });

    it("detects common disfluency markers", () => {
      const markers = ["um", "uh", "uhh", "umm", "hmm", "well", "like"];
      for (const marker of markers) {
        emittedSignals = [];
        analyzer.setOnSignal((signal) => emittedSignals.push(signal));
        analyzer.analyzeResponse(`${marker} this is a test sentence with the word ${marker} in it`);
        expect(emittedSignals[0].disfluencyCount).toBeGreaterThanOrEqual(1);
      }
    });

    it("no disfluency in clean text", () => {
      analyzer.analyzeResponse(
        "REST is an architectural style for designing networked applications using HTTP methods"
      );

      // No common disfluency markers
      expect(emittedSignals[0].disfluencyCount).toBe(0);
    });
  });

  // ── Fluency score ────────────────────────────────────────────────

  describe("fluency score", () => {
    it("perfect fluency (no disfluency) scores 1.0 (suspicious)", () => {
      analyzer.analyzeResponse(
        "REST is an architectural style that uses standard HTTP methods for communication between distributed systems"
      );

      expect(emittedSignals[0].fluencyScore).toBe(1.0);
    });

    it("natural speech with disfluency scores 0.0", () => {
      // ~5% disfluency rate: 3 markers in ~60 words
      analyzer.analyzeResponse(
        "Um so I think REST is like an architectural style well it uses HTTP methods for communication um between distributed systems and it emphasizes statelessness meaning each request contains all needed information like you know without relying on server sessions or stored context between calls"
      );

      expect(emittedSignals[0].fluencyScore).toBe(0);
    });

    it("moderate polish scores 0.5", () => {
      // ~1-3% disfluency rate
      const words = Array(80).fill("word");
      words[40] = "um"; // 1 disfluency in 81 words ≈ 1.2%
      analyzer.analyzeResponse(words.join(" "));

      expect(emittedSignals[0].fluencyScore).toBe(0.5);
    });
  });

  // ── isSuspiciouslyFast ───────────────────────────────────────────

  describe("isSuspiciouslyFast", () => {
    it("returns false when no question asked", () => {
      expect(analyzer.isSuspiciouslyFast()).toBe(false);
    });

    it("returns false when no response started", () => {
      analyzer.markQuestionAsked(true);
      expect(analyzer.isSuspiciouslyFast()).toBe(false);
    });

    it("returns true for complex question with fast response", () => {
      const now = Date.now();
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now) // markQuestionAsked
        .mockReturnValueOnce(now + 300); // markResponseStart

      analyzer.markQuestionAsked(true); // complex question
      analyzer.markResponseStart();

      expect(analyzer.isSuspiciouslyFast()).toBe(true);
    });

    it("returns false for simple question with fast response", () => {
      const now = Date.now();
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 300);

      analyzer.markQuestionAsked(false); // simple question
      analyzer.markResponseStart();

      expect(analyzer.isSuspiciouslyFast()).toBe(false);
    });

    it("returns false for complex question with slow response", () => {
      const now = Date.now();
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 2000);

      analyzer.markQuestionAsked(true);
      analyzer.markResponseStart();

      expect(analyzer.isSuspiciouslyFast()).toBe(false);
    });
  });

  // ── State reset ──────────────────────────────────────────────────

  describe("state reset after analyzeResponse", () => {
    it("resets question/response times after analysis", () => {
      analyzer.markQuestionAsked();
      analyzer.markResponseStart();
      analyzer.analyzeResponse("Answer");

      // Second call without marking question should have 0 delay
      analyzer.analyzeResponse("Another answer");

      expect(emittedSignals[1].onsetDelayMs).toBe(0);
    });
  });

  // ── Signal emission ──────────────────────────────────────────────

  describe("signal emission", () => {
    it("emits TimingSignal with all required fields", () => {
      analyzer.markQuestionAsked();
      analyzer.markResponseStart();
      analyzer.analyzeResponse("My answer is about REST APIs");

      const signal = emittedSignals[0];
      expect(signal).toHaveProperty("onsetDelayMs");
      expect(signal).toHaveProperty("disfluencyCount");
      expect(signal).toHaveProperty("fluencyScore");
      expect(signal).toHaveProperty("timestamp");
      expect(typeof signal.onsetDelayMs).toBe("number");
      expect(typeof signal.disfluencyCount).toBe("number");
      expect(typeof signal.fluencyScore).toBe("number");
      expect(typeof signal.timestamp).toBe("number");
    });

    it("does not emit when no callback set", () => {
      const noCallbackAnalyzer = new TimingAnalyzer();
      // Should not throw
      noCallbackAnalyzer.analyzeResponse("Test answer");
    });
  });
});
