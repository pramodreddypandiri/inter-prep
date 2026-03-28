import { describe, it, expect } from "vitest";

/**
 * AudioAnalyzer depends on Web Audio API (browser-only), so we test the
 * detection algorithms by extracting their logic into testable forms.
 *
 * These tests validate the pitch estimation, typing detection, and
 * second speaker detection algorithms.
 */

// ── Extracted algorithm implementations (matching audio-analyzer.ts) ──

function estimatePitch(freqData: Uint8Array, sampleRate: number, windowSize: number): number {
  let sum = 0;
  for (let i = 0; i < freqData.length; i++) {
    sum += freqData[i];
  }
  const avg = sum / freqData.length;
  if (avg < 10) return 0;

  const binSize = sampleRate / windowSize;
  const lowBin = Math.floor(85 / binSize);
  const highBin = Math.ceil(400 / binSize);

  let maxVal = 0;
  let maxBin = lowBin;
  for (let i = lowBin; i <= highBin && i < freqData.length; i++) {
    if (freqData[i] > maxVal) {
      maxVal = freqData[i];
      maxBin = i;
    }
  }

  return maxVal > 30 ? maxBin * binSize : 0;
}

function detectTypingSounds(
  freqData: Uint8Array,
  sampleRate: number,
  windowSize: number
): boolean {
  const binSize = sampleRate / windowSize;
  const lowBin = Math.floor(200 / binSize);
  const highBin = Math.ceil(800 / binSize);

  let typingEnergy = 0;
  let typingCount = 0;
  for (let i = lowBin; i <= highBin && i < freqData.length; i++) {
    typingEnergy += freqData[i];
    typingCount++;
  }
  const avgTypingEnergy = typingCount > 0 ? typingEnergy / typingCount : 0;

  const voiceLow = Math.floor(85 / binSize);
  const voiceHigh = Math.ceil(300 / binSize);
  let voiceEnergy = 0;
  let voiceCount = 0;
  for (let i = voiceLow; i <= voiceHigh && i < freqData.length; i++) {
    voiceEnergy += freqData[i];
    voiceCount++;
  }
  const avgVoiceEnergy = voiceCount > 0 ? voiceEnergy / voiceCount : 0;

  return avgTypingEnergy > 60 && avgTypingEnergy > avgVoiceEnergy * 1.5;
}

function detectSecondSpeaker(
  freqData: Uint8Array,
  sampleRate: number,
  windowSize: number
): boolean {
  const binSize = sampleRate / windowSize;
  const lowBin = Math.floor(85 / binSize);
  const highBin = Math.ceil(400 / binSize);

  const peaks: { bin: number; val: number }[] = [];
  for (let i = lowBin + 1; i < highBin - 1 && i < freqData.length - 1; i++) {
    if (freqData[i] > freqData[i - 1] && freqData[i] > freqData[i + 1] && freqData[i] > 50) {
      peaks.push({ bin: i, val: freqData[i] });
    }
  }

  if (peaks.length < 2) return false;

  peaks.sort((a, b) => b.val - a.val);
  const freqDiff = Math.abs(peaks[0].bin - peaks[1].bin) * binSize;

  return freqDiff > 50 && peaks[1].val > peaks[0].val * 0.4;
}

function computePitchVariance(history: number[]): number {
  if (history.length < 3) return 100;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  return history.reduce((sum, p) => sum + (p - mean) ** 2, 0) / history.length;
}

// ── Test helpers ───────────────────────────────────────────────────

const SAMPLE_RATE = 48000;
const WINDOW_SIZE = 2048;
const BIN_COUNT = WINDOW_SIZE / 2;

function makeFreqData(size: number = BIN_COUNT, fill: number = 0): Uint8Array {
  return new Uint8Array(size).fill(fill);
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Audio Analyzer Algorithms", () => {
  describe("estimatePitch", () => {
    it("returns 0 for silent audio (avg < 10)", () => {
      const data = makeFreqData(BIN_COUNT, 5);
      expect(estimatePitch(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(0);
    });

    it("returns 0 when no strong peak in voice range", () => {
      const data = makeFreqData(BIN_COUNT, 15); // above quiet threshold
      // But all bins uniform (< 30), so no peak
      expect(estimatePitch(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(0);
    });

    it("detects dominant frequency in voice range", () => {
      const data = makeFreqData(BIN_COUNT, 15);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;

      // Put strong peak at ~150Hz
      const targetBin = Math.round(150 / binSize);
      data[targetBin] = 200;

      const pitch = estimatePitch(data, SAMPLE_RATE, WINDOW_SIZE);
      expect(pitch).toBeGreaterThan(100);
      expect(pitch).toBeLessThan(200);
    });

    it("ignores frequencies outside 85-400Hz range", () => {
      const data = makeFreqData(BIN_COUNT, 15);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;

      // Put strong peak at 1000Hz (outside voice range)
      const outsideBin = Math.round(1000 / binSize);
      if (outsideBin < data.length) {
        data[outsideBin] = 200;
      }

      // No strong peak in voice range
      expect(estimatePitch(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(0);
    });
  });

  describe("detectTypingSounds", () => {
    it("returns false for silent audio", () => {
      const data = makeFreqData(BIN_COUNT, 0);
      expect(detectTypingSounds(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(false);
    });

    it("detects typing: high 200-800Hz energy, low voice energy", () => {
      const data = makeFreqData(BIN_COUNT, 10);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;

      // Fill typing range (200-800Hz) with high energy
      const lowBin = Math.floor(200 / binSize);
      const highBin = Math.ceil(800 / binSize);
      for (let i = lowBin; i <= highBin && i < data.length; i++) {
        data[i] = 100;
      }

      expect(detectTypingSounds(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(true);
    });

    it("rejects when voice energy is dominant", () => {
      const data = makeFreqData(BIN_COUNT, 10);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;

      // Strong voice energy
      const voiceLow = Math.floor(85 / binSize);
      const voiceHigh = Math.ceil(300 / binSize);
      for (let i = voiceLow; i <= voiceHigh && i < data.length; i++) {
        data[i] = 200;
      }

      // Moderate typing range energy
      const typLow = Math.floor(200 / binSize);
      const typHigh = Math.ceil(800 / binSize);
      for (let i = typLow; i <= typHigh && i < data.length; i++) {
        data[i] = Math.max(data[i], 80); // don't override higher voice values
      }

      expect(detectTypingSounds(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(false);
    });

    it("rejects when typing energy below threshold (60)", () => {
      const data = makeFreqData(BIN_COUNT, 30);
      expect(detectTypingSounds(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(false);
    });
  });

  describe("detectSecondSpeaker", () => {
    it("returns false for silent audio", () => {
      const data = makeFreqData(BIN_COUNT, 0);
      expect(detectSecondSpeaker(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(false);
    });

    it("returns false for single speaker (one peak)", () => {
      const data = makeFreqData(BIN_COUNT, 20);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;
      const peakBin = Math.round(150 / binSize);
      data[peakBin] = 100;
      // No second strong peak

      expect(detectSecondSpeaker(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(false);
    });

    it("detects two speakers: two strong peaks > 50Hz apart", () => {
      const data = makeFreqData(BIN_COUNT, 20);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;

      // Speaker 1: ~120Hz
      const peak1 = Math.round(120 / binSize);
      data[peak1] = 100;

      // Speaker 2: ~250Hz (>50Hz apart)
      const peak2 = Math.round(250 / binSize);
      data[peak2] = 80;

      expect(detectSecondSpeaker(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(true);
    });

    it("rejects when peaks are too close in frequency", () => {
      const data = makeFreqData(BIN_COUNT, 20);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;

      // Two peaks only 30Hz apart
      const peak1 = Math.round(150 / binSize);
      const peak2 = Math.round(180 / binSize);
      data[peak1] = 100;
      data[peak2] = 80;

      expect(detectSecondSpeaker(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(false);
    });

    it("rejects when second peak is too weak (<40% of first)", () => {
      const data = makeFreqData(BIN_COUNT, 20);
      const binSize = SAMPLE_RATE / WINDOW_SIZE;

      const peak1 = Math.round(120 / binSize);
      const peak2 = Math.round(300 / binSize);
      data[peak1] = 200;
      data[peak2] = 55; // 55/200 = 27.5% < 40%

      expect(detectSecondSpeaker(data, SAMPLE_RATE, WINDOW_SIZE)).toBe(false);
    });
  });

  describe("computePitchVariance", () => {
    it("returns 100 (default) for fewer than 3 samples", () => {
      expect(computePitchVariance([])).toBe(100);
      expect(computePitchVariance([120])).toBe(100);
      expect(computePitchVariance([120, 130])).toBe(100);
    });

    it("returns 0 for constant pitch", () => {
      expect(computePitchVariance([150, 150, 150, 150])).toBe(0);
    });

    it("returns correct variance", () => {
      // [100, 200, 300] → mean=200, variance=((−100)²+0²+100²)/3 ≈ 6666.67
      const variance = computePitchVariance([100, 200, 300]);
      expect(variance).toBeCloseTo(6666.67, 0);
    });

    it("natural speech has higher variance than monotone", () => {
      const monotone = computePitchVariance([150, 152, 148, 151, 149]);
      const natural = computePitchVariance([120, 180, 140, 200, 130]);

      expect(natural).toBeGreaterThan(monotone);
    });
  });
});
