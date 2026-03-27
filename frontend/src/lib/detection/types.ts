// ─── Signal types emitted by each detection module ───

export interface GazeSignal {
  entropy: number; // 0–1, low = reading pattern
  saccadeRate: number; // horizontal saccades per second
  gazeAngleOffset: number; // degrees off camera axis
  readingPatternDetected: boolean;
  timestamp: number;
}

export interface TimingSignal {
  onsetDelayMs: number; // ms from question end to first word
  disfluencyCount: number; // "um", "uh", "let me think", etc.
  fluencyScore: number; // 0–1, 1 = suspiciously perfect
  timestamp: number;
}

export interface AudioSignal {
  pitchVariance: number; // Hz² variance over window
  typingDetected: boolean;
  secondSpeakerDetected: boolean;
  timestamp: number;
}

// ─── Combined risk assessment ───

export interface RiskSnapshot {
  score: number; // 0–100
  timestamp: number;
  breakdown: {
    gazeEntropy: number;
    readingPattern: number;
    onsetDelay: number;
    fluencyScore: number;
    tabSwitches: number;
    typingDetected: number;
    secondSpeaker: number;
  };
  flags: string[];
}

// ─── Extended eye tracking stats (replaces old EyeTrackingStats) ───

export interface IntegrityStats {
  totalLookAways: number;
  readingPatterns: number;
  avgGazeOffset: number;
  tabSwitchCount: number;
  typingDetections: number;
  secondSpeakerDetections: number;
  riskTimeline: RiskSnapshot[];
  currentRiskScore: number;
  suspiciousEvents: { timestamp: number; type: string; detail?: string }[];
}
