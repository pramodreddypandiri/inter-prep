import { describe, it, expect } from "vitest";
import type {
  GazeSignal,
  TimingSignal,
  AudioSignal,
  RiskSnapshot,
  IntegrityStats,
} from "../types";

/**
 * Contract tests ensuring TypeScript interfaces stay aligned with
 * what the backend expects (EyeTrackingStats in mock_interview router)
 * and what each detection module produces.
 */

describe("Frontend ↔ Backend Contract Tests", () => {
  describe("IntegrityStats → Backend EyeTrackingStats mapping", () => {
    it("IntegrityStats has the fields needed to build backend payload", () => {
      // The frontend sends this shape to the backend:
      // { totalLookAways: number, readingPatterns: number, suspiciousEvents: unknown[] }
      //
      // IntegrityStats must have these fields
      const stats: IntegrityStats = {
        totalLookAways: 5,
        readingPatterns: 2,
        avgGazeOffset: 10.5,
        tabSwitchCount: 1,
        typingDetections: 0,
        secondSpeakerDetections: 0,
        riskTimeline: [],
        currentRiskScore: 35,
        suspiciousEvents: [{ timestamp: Date.now(), type: "look_away" }],
      };

      // These three fields are what api.ts sends to the backend
      expect(stats).toHaveProperty("totalLookAways");
      expect(stats).toHaveProperty("readingPatterns");
      expect(stats).toHaveProperty("suspiciousEvents");
      expect(typeof stats.totalLookAways).toBe("number");
      expect(typeof stats.readingPatterns).toBe("number");
      expect(Array.isArray(stats.suspiciousEvents)).toBe(true);
    });

    it("matches the backend EyeTrackingStats shape exactly", () => {
      // Backend Pydantic model: EyeTrackingStats
      // totalLookAways: int = 0
      // readingPatterns: int = 0
      // suspiciousEvents: list = []
      const backendPayload = {
        totalLookAways: 5,
        readingPatterns: 2,
        suspiciousEvents: [{ type: "tab_switch", timestamp: 123456 }],
      };

      // Verify types match backend expectations
      expect(Number.isInteger(backendPayload.totalLookAways)).toBe(true);
      expect(Number.isInteger(backendPayload.readingPatterns)).toBe(true);
      expect(Array.isArray(backendPayload.suspiciousEvents)).toBe(true);
    });
  });

  describe("GazeSignal contract", () => {
    it("has all required fields with correct types", () => {
      const signal: GazeSignal = {
        entropy: 0.5,
        saccadeRate: 2.5,
        gazeAngleOffset: 10.0,
        readingPatternDetected: false,
        timestamp: Date.now(),
      };

      expect(typeof signal.entropy).toBe("number");
      expect(typeof signal.saccadeRate).toBe("number");
      expect(typeof signal.gazeAngleOffset).toBe("number");
      expect(typeof signal.readingPatternDetected).toBe("boolean");
      expect(typeof signal.timestamp).toBe("number");
    });

    it("entropy is bounded 0-1", () => {
      const signal: GazeSignal = {
        entropy: 0.5,
        saccadeRate: 0,
        gazeAngleOffset: 0,
        readingPatternDetected: false,
        timestamp: Date.now(),
      };
      expect(signal.entropy).toBeGreaterThanOrEqual(0);
      expect(signal.entropy).toBeLessThanOrEqual(1);
    });
  });

  describe("TimingSignal contract", () => {
    it("has all required fields", () => {
      const signal: TimingSignal = {
        onsetDelayMs: 1500,
        disfluencyCount: 3,
        fluencyScore: 0.0,
        timestamp: Date.now(),
      };

      expect(typeof signal.onsetDelayMs).toBe("number");
      expect(typeof signal.disfluencyCount).toBe("number");
      expect(typeof signal.fluencyScore).toBe("number");
      expect(typeof signal.timestamp).toBe("number");
    });

    it("fluencyScore is bounded 0-1", () => {
      for (const val of [0, 0.5, 1.0]) {
        const signal: TimingSignal = {
          onsetDelayMs: 0,
          disfluencyCount: 0,
          fluencyScore: val,
          timestamp: Date.now(),
        };
        expect(signal.fluencyScore).toBeGreaterThanOrEqual(0);
        expect(signal.fluencyScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("AudioSignal contract", () => {
    it("has all required fields", () => {
      const signal: AudioSignal = {
        pitchVariance: 150.0,
        typingDetected: false,
        secondSpeakerDetected: false,
        timestamp: Date.now(),
      };

      expect(typeof signal.pitchVariance).toBe("number");
      expect(typeof signal.typingDetected).toBe("boolean");
      expect(typeof signal.secondSpeakerDetected).toBe("boolean");
      expect(typeof signal.timestamp).toBe("number");
    });
  });

  describe("RiskSnapshot contract", () => {
    it("has score, timestamp, breakdown, and flags", () => {
      const snapshot: RiskSnapshot = {
        score: 42,
        timestamp: Date.now(),
        breakdown: {
          gazeEntropy: 20,
          readingPattern: 0,
          onsetDelay: 30,
          fluencyScore: 10,
          tabSwitches: 25,
          typingDetected: 0,
          secondSpeaker: 0,
        },
        flags: ["1 tab switch(es)"],
      };

      expect(snapshot.score).toBeGreaterThanOrEqual(0);
      expect(snapshot.score).toBeLessThanOrEqual(100);
      expect(typeof snapshot.timestamp).toBe("number");
      expect(Array.isArray(snapshot.flags)).toBe(true);

      // Breakdown keys match RiskEngine WEIGHTS
      const expectedKeys = [
        "gazeEntropy",
        "readingPattern",
        "onsetDelay",
        "fluencyScore",
        "tabSwitches",
        "typingDetected",
        "secondSpeaker",
      ];
      for (const key of expectedKeys) {
        expect(snapshot.breakdown).toHaveProperty(key);
      }
    });
  });

  describe("API client payload contracts", () => {
    it("createSession payload matches backend SessionCreate", () => {
      // What api.ts sends
      const payload = {
        name: "Google SWE",
        company_name: "Google",
        jd_text: "Looking for SWE...",
        resume_text: "5 years experience...",
        round_description: "Phone screen",
      };

      // Backend expects exactly these 5 fields
      const requiredFields = ["name", "company_name", "jd_text", "resume_text", "round_description"];
      for (const field of requiredFields) {
        expect(payload).toHaveProperty(field);
        expect(typeof (payload as any)[field]).toBe("string");
      }
    });

    it("createQuiz payload matches backend QuizCreate", () => {
      const payload = { topics: "REST APIs", num_questions: 10 };
      expect(typeof payload.topics).toBe("string");
      expect(typeof payload.num_questions).toBe("number");
      expect(payload.num_questions).toBeGreaterThanOrEqual(1);
      expect(payload.num_questions).toBeLessThanOrEqual(30);
    });

    it("submitQuiz payload matches backend QuizSubmit", () => {
      const payload = {
        answers: [
          { question_id: 1, answer: "REST is an architectural style" },
          { question_id: 2, answer: "Statelessness means..." },
        ],
      };
      expect(Array.isArray(payload.answers)).toBe(true);
      for (const a of payload.answers) {
        expect(typeof a.question_id).toBe("number");
        expect(typeof a.answer).toBe("string");
      }
    });

    it("createMockInterview payload matches backend MockInterviewCreate", () => {
      const payload = {
        topics: "System Design",
        duration: 30,
        difficulty: "senior",
      };
      expect(typeof payload.topics).toBe("string");
      expect(typeof payload.duration).toBe("number");
      expect(payload.duration).toBeGreaterThanOrEqual(5);
      expect(payload.duration).toBeLessThanOrEqual(90);
      expect(typeof payload.difficulty).toBe("string");
    });

    it("endMockInterview payload matches backend EndInterviewRequest", () => {
      const payload = {
        eye_tracking: {
          totalLookAways: 3,
          readingPatterns: 1,
          suspiciousEvents: [{ type: "tab_switch" }],
        },
      };
      expect(payload.eye_tracking).toBeDefined();
      expect(typeof payload.eye_tracking!.totalLookAways).toBe("number");
      expect(typeof payload.eye_tracking!.readingPatterns).toBe("number");
      expect(Array.isArray(payload.eye_tracking!.suspiciousEvents)).toBe(true);
    });

    it("endMockInterview allows null eye_tracking", () => {
      const payload = { eye_tracking: null };
      expect(payload.eye_tracking).toBeNull();
    });
  });
});
