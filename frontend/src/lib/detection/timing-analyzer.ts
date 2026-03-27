import type { TimingSignal } from "./types";

const DISFLUENCY_MARKERS = [
  "um",
  "uh",
  "uhh",
  "umm",
  "hmm",
  "let me think",
  "so",
  "well",
  "you know",
  "like",
  "i mean",
];

export class TimingAnalyzer {
  private questionEndTime: number | null = null;
  private responseStartTime: number | null = null;
  private onSignal: ((signal: TimingSignal) => void) | null = null;
  private isQuestionComplex = false;

  setOnSignal(cb: (signal: TimingSignal) => void): void {
    this.onSignal = cb;
  }

  /**
   * Call when the interviewer finishes asking a question.
   * @param complex - whether this question is tagged as complex
   */
  markQuestionAsked(complex: boolean = false): void {
    this.questionEndTime = Date.now();
    this.responseStartTime = null;
    this.isQuestionComplex = complex;
  }

  /**
   * Call when the candidate starts speaking (first word detected).
   */
  markResponseStart(): void {
    if (this.responseStartTime === null) {
      this.responseStartTime = Date.now();
    }
  }

  /**
   * Call when the candidate finishes their response.
   * Analyzes timing and disfluency, emits TimingSignal.
   */
  analyzeResponse(responseText: string): void {
    const now = Date.now();

    // Onset delay
    let onsetDelayMs = 0;
    if (this.questionEndTime) {
      const responseStart = this.responseStartTime || now;
      onsetDelayMs = responseStart - this.questionEndTime;
    }

    // Disfluency analysis
    const lowerText = responseText.toLowerCase();
    let disfluencyCount = 0;
    for (const marker of DISFLUENCY_MARKERS) {
      const regex = new RegExp(`\\b${marker}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches) disfluencyCount += matches.length;
    }

    // Fluency score: 0 = very disfluent (natural), 1 = suspiciously perfect
    const wordCount = responseText.trim().split(/\s+/).length;
    const disfluencyRate = wordCount > 0 ? disfluencyCount / wordCount : 0;

    // Natural speech has ~3-8% disfluency rate
    // Very polished/scripted = near 0%
    let fluencyScore: number;
    if (disfluencyRate >= 0.03) {
      fluencyScore = 0; // Natural
    } else if (disfluencyRate >= 0.01) {
      fluencyScore = 0.5; // Somewhat polished
    } else {
      fluencyScore = 1.0; // Suspiciously fluent
    }

    // Reset
    this.questionEndTime = null;
    this.responseStartTime = null;

    this.onSignal?.({
      onsetDelayMs,
      disfluencyCount,
      fluencyScore,
      timestamp: now,
    });
  }

  /**
   * Whether the onset delay is suspiciously fast for the question complexity.
   */
  isSuspiciouslyFast(): boolean {
    if (!this.questionEndTime || !this.responseStartTime) return false;
    const delay = this.responseStartTime - this.questionEndTime;
    return this.isQuestionComplex && delay < 800;
  }
}
