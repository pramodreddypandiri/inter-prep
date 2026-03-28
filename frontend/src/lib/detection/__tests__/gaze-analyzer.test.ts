import { describe, it, expect } from "vitest";

/**
 * GazeAnalyzer depends on MediaPipe (browser WASM), so we test the pure
 * mathematical functions by extracting their logic into testable forms.
 *
 * These tests validate the entropy, saccade rate, offset, and reading
 * pattern detection algorithms using the same formulas from the source.
 */

// ── Extracted algorithm implementations (matching gaze-analyzer.ts) ──

interface GazePoint {
  yaw: number;
  pitch: number;
  timestamp: number;
}

function computeEntropy(points: GazePoint[]): number {
  const BINS = 12;
  const MIN_YAW = -30;
  const MAX_YAW = 30;
  const binWidth = (MAX_YAW - MIN_YAW) / BINS;
  const counts = new Array(BINS).fill(0);

  for (const p of points) {
    const bin = Math.min(BINS - 1, Math.max(0, Math.floor((p.yaw - MIN_YAW) / binWidth)));
    counts[bin]++;
  }

  const total = points.length;
  let entropy = 0;
  for (const count of counts) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy / Math.log2(BINS);
}

function computeSaccadeRate(points: GazePoint[]): number {
  if (points.length < 2) return 0;

  const SACCADE_THRESHOLD_DEG = 3;
  const SACCADE_SPEED_DEG_PER_S = 30;

  let saccadeCount = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].timestamp - points[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;
    const dYaw = Math.abs(points[i].yaw - points[i - 1].yaw);
    const speed = dYaw / dt;

    if (dYaw >= SACCADE_THRESHOLD_DEG && speed >= SACCADE_SPEED_DEG_PER_S) {
      saccadeCount++;
    }
  }

  const windowDuration = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
  return windowDuration > 0 ? saccadeCount / windowDuration : 0;
}

function computeAvgOffset(points: GazePoint[]): number {
  if (points.length === 0) return 0;
  const totalOffset = points.reduce(
    (sum, p) => sum + Math.sqrt(p.yaw * p.yaw + p.pitch * p.pitch),
    0
  );
  return totalOffset / points.length;
}

function detectReadingPattern(points: GazePoint[]): boolean {
  if (points.length < 10) return false;

  const pitches = points.map((p) => p.pitch);
  const pitchMean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  const pitchVar = pitches.reduce((sum, p) => sum + (p - pitchMean) ** 2, 0) / pitches.length;

  const yaws = points.map((p) => p.yaw);
  const yawMean = yaws.reduce((a, b) => a + b, 0) / yaws.length;
  const yawVar = yaws.reduce((sum, y) => sum + (y - yawMean) ** 2, 0) / yaws.length;

  let dirChanges = 0;
  for (let i = 2; i < yaws.length; i++) {
    const prev = yaws[i - 1] - yaws[i - 2];
    const curr = yaws[i] - yaws[i - 1];
    if (prev * curr < 0 && Math.abs(curr) > 1) {
      dirChanges++;
    }
  }

  return pitchVar < 4 && yawVar > 9 && dirChanges >= 3;
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Gaze Analyzer Algorithms", () => {
  describe("computeEntropy", () => {
    it("returns 1.0 for uniform distribution across all bins", () => {
      // Points evenly spread across yaw range
      const points: GazePoint[] = [];
      for (let i = 0; i < 120; i++) {
        points.push({ yaw: -30 + (i / 120) * 60, pitch: 0, timestamp: i * 100 });
      }

      const e = computeEntropy(points);
      expect(e).toBeCloseTo(1.0, 1);
    });

    it("returns low value when all points cluster in one bin", () => {
      const points: GazePoint[] = [];
      for (let i = 0; i < 50; i++) {
        points.push({ yaw: 0, pitch: 0, timestamp: i * 100 });
      }

      const e = computeEntropy(points);
      expect(e).toBeLessThan(0.1);
    });

    it("reading pattern (narrow band) has lower entropy than random gaze", () => {
      // Reading: yaw oscillates in narrow band
      const readingPoints: GazePoint[] = [];
      for (let i = 0; i < 30; i++) {
        readingPoints.push({ yaw: Math.sin(i * 0.5) * 3, pitch: 0, timestamp: i * 100 });
      }

      // Random: yaw covers wide range
      const randomPoints: GazePoint[] = [];
      for (let i = 0; i < 30; i++) {
        randomPoints.push({ yaw: (Math.random() - 0.5) * 50, pitch: 0, timestamp: i * 100 });
      }

      expect(computeEntropy(readingPoints)).toBeLessThan(computeEntropy(randomPoints));
    });
  });

  describe("computeSaccadeRate", () => {
    it("returns 0 for single point", () => {
      expect(computeSaccadeRate([{ yaw: 0, pitch: 0, timestamp: 0 }])).toBe(0);
    });

    it("returns 0 for stationary gaze", () => {
      const points: GazePoint[] = [];
      for (let i = 0; i < 10; i++) {
        points.push({ yaw: 0, pitch: 0, timestamp: i * 100 });
      }
      expect(computeSaccadeRate(points)).toBe(0);
    });

    it("detects rapid horizontal movements", () => {
      // Rapid saccades: 10 degrees in 50ms = 200 deg/s (well above threshold)
      const points: GazePoint[] = [
        { yaw: 0, pitch: 0, timestamp: 0 },
        { yaw: 10, pitch: 0, timestamp: 50 },
        { yaw: 0, pitch: 0, timestamp: 100 },
        { yaw: 10, pitch: 0, timestamp: 150 },
      ];

      expect(computeSaccadeRate(points)).toBeGreaterThan(0);
    });

    it("ignores slow movements below threshold", () => {
      // Slow drift: 2 degrees in 1000ms = 2 deg/s (below 30 deg/s threshold)
      const points: GazePoint[] = [
        { yaw: 0, pitch: 0, timestamp: 0 },
        { yaw: 2, pitch: 0, timestamp: 1000 },
        { yaw: 4, pitch: 0, timestamp: 2000 },
      ];

      expect(computeSaccadeRate(points)).toBe(0);
    });
  });

  describe("computeAvgOffset", () => {
    it("returns 0 for empty array", () => {
      expect(computeAvgOffset([])).toBe(0);
    });

    it("returns 0 for centered gaze", () => {
      const points = [{ yaw: 0, pitch: 0, timestamp: 0 }];
      expect(computeAvgOffset(points)).toBe(0);
    });

    it("computes euclidean distance from center", () => {
      const points = [{ yaw: 3, pitch: 4, timestamp: 0 }];
      expect(computeAvgOffset(points)).toBeCloseTo(5, 5); // 3-4-5 triangle
    });

    it("averages offsets across points", () => {
      const points = [
        { yaw: 3, pitch: 4, timestamp: 0 }, // offset = 5
        { yaw: 0, pitch: 0, timestamp: 100 }, // offset = 0
      ];
      expect(computeAvgOffset(points)).toBeCloseTo(2.5, 5);
    });
  });

  describe("detectReadingPattern", () => {
    it("returns false for fewer than 10 points", () => {
      const points: GazePoint[] = [];
      for (let i = 0; i < 9; i++) {
        points.push({ yaw: Math.sin(i) * 10, pitch: 0, timestamp: i * 100 });
      }
      expect(detectReadingPattern(points)).toBe(false);
    });

    it("detects reading: low pitch variance, high yaw variance, direction changes", () => {
      // Simulate reading left-to-right-to-left with consistent pitch
      // Need: pitchVar < 4, yawVar > 9, dirChanges >= 3
      const points: GazePoint[] = [];
      for (let i = 0; i < 30; i++) {
        // Triangle wave oscillating ±10 degrees — ensures yawVar > 9 and many dir changes
        const phase = (i % 10) / 10;
        const yaw = phase < 0.5 ? -10 + phase * 40 : 10 - (phase - 0.5) * 40;
        points.push({ yaw, pitch: 0.5, timestamp: i * 100 });
      }

      expect(detectReadingPattern(points)).toBe(true);
    });

    it("rejects natural gaze: high pitch variance", () => {
      const points: GazePoint[] = [];
      for (let i = 0; i < 30; i++) {
        points.push({
          yaw: Math.sin(i * 0.4) * 8,
          pitch: Math.random() * 10 - 5, // wild pitch variance
          timestamp: i * 100,
        });
      }

      expect(detectReadingPattern(points)).toBe(false);
    });

    it("rejects fixed stare: low yaw variance", () => {
      const points: GazePoint[] = [];
      for (let i = 0; i < 30; i++) {
        points.push({
          yaw: 0.5 + Math.random() * 0.5, // very narrow yaw range
          pitch: 0.5,
          timestamp: i * 100,
        });
      }

      expect(detectReadingPattern(points)).toBe(false);
    });
  });
});
