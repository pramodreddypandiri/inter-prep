import type {
  GazeSignal,
  TimingSignal,
  AudioSignal,
  RiskSnapshot,
  IntegrityStats,
} from "./types";

const WEIGHTS = {
  gazeEntropy: 0.2,
  readingPattern: 0.2,
  onsetDelay: 0.15,
  fluencyScore: 0.1,
  tabSwitches: 0.1,
  typingDetected: 0.1,
  secondSpeaker: 0.08,
  screenShare: 0.07,
};

export class RiskEngine {
  private timeline: RiskSnapshot[] = [];
  private latestGaze: GazeSignal | null = null;
  private latestTiming: TimingSignal | null = null;
  private latestAudio: AudioSignal | null = null;
  private tabSwitchCount = 0;
  private tabSwitchListener: (() => void) | null = null;

  // Running stats
  private stats: IntegrityStats = {
    totalLookAways: 0,
    readingPatterns: 0,
    avgGazeOffset: 0,
    tabSwitchCount: 0,
    typingDetections: 0,
    secondSpeakerDetections: 0,
    riskTimeline: [],
    currentRiskScore: 0,
    suspiciousEvents: [],
  };

  private gazeOffsets: number[] = [];

  constructor() {
    // Track tab switches
    this.tabSwitchListener = () => {
      if (document.hidden) {
        this.tabSwitchCount++;
        this.stats.tabSwitchCount = this.tabSwitchCount;
        this.stats.suspiciousEvents.push({
          timestamp: Date.now(),
          type: "tab_switch",
        });
      }
    };
    document.addEventListener("visibilitychange", this.tabSwitchListener);
  }

  destroy(): void {
    if (this.tabSwitchListener) {
      document.removeEventListener("visibilitychange", this.tabSwitchListener);
      this.tabSwitchListener = null;
    }
  }

  updateGaze(signal: GazeSignal): void {
    this.latestGaze = signal;
    this.gazeOffsets.push(signal.gazeAngleOffset);

    if (signal.readingPatternDetected) {
      this.stats.readingPatterns++;
      this.stats.suspiciousEvents.push({
        timestamp: signal.timestamp,
        type: "reading_pattern",
        detail: `entropy=${signal.entropy.toFixed(2)}, saccadeRate=${signal.saccadeRate.toFixed(1)}`,
      });
    }

    if (signal.gazeAngleOffset > 15) {
      this.stats.totalLookAways++;
      this.stats.suspiciousEvents.push({
        timestamp: signal.timestamp,
        type: "look_away",
        detail: `offset=${signal.gazeAngleOffset.toFixed(1)}°`,
      });
    }

    // Update avg offset
    this.stats.avgGazeOffset =
      this.gazeOffsets.reduce((a, b) => a + b, 0) / this.gazeOffsets.length;

    this.recompute();
  }

  updateTiming(signal: TimingSignal): void {
    this.latestTiming = signal;
    this.recompute();
  }

  updateAudio(signal: AudioSignal): void {
    this.latestAudio = signal;

    if (signal.typingDetected) {
      this.stats.typingDetections++;
      this.stats.suspiciousEvents.push({
        timestamp: signal.timestamp,
        type: "typing_detected",
      });
    }

    if (signal.secondSpeakerDetected) {
      this.stats.secondSpeakerDetections++;
      this.stats.suspiciousEvents.push({
        timestamp: signal.timestamp,
        type: "second_speaker",
      });
    }

    this.recompute();
  }

  private recompute(): void {
    const snapshot = this.computeSnapshot();
    this.timeline.push(snapshot);
    this.stats.riskTimeline = this.timeline;
    this.stats.currentRiskScore = snapshot.score;
  }

  private computeSnapshot(): RiskSnapshot {
    const flags: string[] = [];

    // Gaze entropy: low entropy (0) = reading → score 100; high entropy (1) = natural → 0
    let gazeEntropyScore = 0;
    if (this.latestGaze) {
      gazeEntropyScore = Math.max(0, (1 - this.latestGaze.entropy)) * 100;
      if (this.latestGaze.entropy < 0.3) flags.push("Low gaze entropy (reading pattern)");
    }

    // Reading pattern: binary, heavily weighted
    let readingPatternScore = 0;
    if (this.latestGaze?.readingPatternDetected) {
      readingPatternScore = 100;
      flags.push("Reading saccades detected");
    }

    // Onset delay: < 800ms for any question is suspicious
    let onsetDelayScore = 0;
    if (this.latestTiming) {
      if (this.latestTiming.onsetDelayMs < 500) {
        onsetDelayScore = 100;
        flags.push("Instant response (<500ms)");
      } else if (this.latestTiming.onsetDelayMs < 800) {
        onsetDelayScore = 70;
        flags.push("Very fast response (<800ms)");
      } else if (this.latestTiming.onsetDelayMs < 1200) {
        onsetDelayScore = 30;
      }
    }

    // Fluency: 1 = suspiciously perfect → 100; 0 = natural → 0
    let fluencyScoreVal = 0;
    if (this.latestTiming) {
      fluencyScoreVal = this.latestTiming.fluencyScore * 100;
      if (this.latestTiming.fluencyScore > 0.8)
        flags.push("Suspiciously fluent speech");
    }

    // Tab switches
    const tabSwitchScore = Math.min(100, this.tabSwitchCount * 25);
    if (this.tabSwitchCount > 0)
      flags.push(`${this.tabSwitchCount} tab switch(es)`);

    // Typing detected
    let typingScore = 0;
    if (this.latestAudio?.typingDetected) {
      typingScore = 100;
      flags.push("Keyboard typing detected");
    }

    // Second speaker
    let secondSpeakerScore = 0;
    if (this.latestAudio?.secondSpeakerDetected) {
      secondSpeakerScore = 100;
      flags.push("Possible second speaker");
    }

    const breakdown = {
      gazeEntropy: gazeEntropyScore,
      readingPattern: readingPatternScore,
      onsetDelay: onsetDelayScore,
      fluencyScore: fluencyScoreVal,
      tabSwitches: tabSwitchScore,
      typingDetected: typingScore,
      secondSpeaker: secondSpeakerScore,
    };

    const score = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          breakdown.gazeEntropy * WEIGHTS.gazeEntropy +
            breakdown.readingPattern * WEIGHTS.readingPattern +
            breakdown.onsetDelay * WEIGHTS.onsetDelay +
            breakdown.fluencyScore * WEIGHTS.fluencyScore +
            breakdown.tabSwitches * WEIGHTS.tabSwitches +
            breakdown.typingDetected * WEIGHTS.typingDetected +
            breakdown.secondSpeaker * WEIGHTS.secondSpeaker
        )
      )
    );

    return {
      score,
      timestamp: Date.now(),
      breakdown,
      flags,
    };
  }

  getStats(): IntegrityStats {
    return { ...this.stats };
  }

  getTimeline(): RiskSnapshot[] {
    return [...this.timeline];
  }

  getCurrentScore(): number {
    return this.stats.currentRiskScore;
  }
}
