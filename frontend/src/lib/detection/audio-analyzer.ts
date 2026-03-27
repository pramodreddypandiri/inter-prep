import type { AudioSignal } from "./types";

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onSignal: ((signal: AudioSignal) => void) | null = null;

  // Buffers
  private pitchHistory: number[] = [];
  private readonly WINDOW_SIZE = 2048;
  private readonly SIGNAL_INTERVAL_MS = 5000;
  private readonly PITCH_WINDOW_MS = 10000;

  start(
    stream: MediaStream,
    onSignal: (signal: AudioSignal) => void
  ): void {
    this.onSignal = onSignal;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.WINDOW_SIZE;
    this.analyser.smoothingTimeConstant = 0.3;

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    this.running = true;
    this.intervalId = setInterval(() => this.analyze(), this.SIGNAL_INTERVAL_MS);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.source?.disconnect();
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
  }

  private analyze(): void {
    if (!this.running || !this.analyser) return;

    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqData);

    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData);

    const pitch = this.estimatePitch(freqData);
    if (pitch > 0) {
      this.pitchHistory.push(pitch);
      // Keep last PITCH_WINDOW_MS worth (roughly)
      const maxSamples = Math.ceil(this.PITCH_WINDOW_MS / this.SIGNAL_INTERVAL_MS) * 10;
      if (this.pitchHistory.length > maxSamples) {
        this.pitchHistory = this.pitchHistory.slice(-maxSamples);
      }
    }

    const pitchVariance = this.computePitchVariance();
    const typingDetected = this.detectTypingSounds(freqData);
    const secondSpeakerDetected = this.detectSecondSpeaker(freqData);

    this.onSignal?.({
      pitchVariance,
      typingDetected,
      secondSpeakerDetected,
      timestamp: Date.now(),
    });
  }

  /**
   * Simple autocorrelation-based pitch estimation.
   * Returns dominant frequency in Hz, or 0 if signal too quiet.
   */
  private estimatePitch(freqData: Uint8Array): number {
    if (!this.audioContext) return 0;

    // Check if there's meaningful audio
    let sum = 0;
    for (let i = 0; i < freqData.length; i++) {
      sum += freqData[i];
    }
    const avg = sum / freqData.length;
    if (avg < 10) return 0; // Too quiet

    // Find peak in voice range (85Hz–400Hz)
    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.WINDOW_SIZE;
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

  private computePitchVariance(): number {
    if (this.pitchHistory.length < 3) return 100; // Assume natural variation initially

    const mean =
      this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length;
    const variance =
      this.pitchHistory.reduce((sum, p) => sum + (p - mean) ** 2, 0) /
      this.pitchHistory.length;

    return variance;
  }

  /**
   * Detect transient high-frequency bursts characteristic of keyboard typing.
   * Typing produces sharp broadband impulses in the 200–800Hz range.
   */
  private detectTypingSounds(freqData: Uint8Array): boolean {
    if (!this.audioContext) return false;

    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.WINDOW_SIZE;
    const lowBin = Math.floor(200 / binSize);
    const highBin = Math.ceil(800 / binSize);

    // Energy in typing range
    let typingEnergy = 0;
    let typingCount = 0;
    for (let i = lowBin; i <= highBin && i < freqData.length; i++) {
      typingEnergy += freqData[i];
      typingCount++;
    }
    const avgTypingEnergy = typingCount > 0 ? typingEnergy / typingCount : 0;

    // Energy in voice range (for comparison)
    const voiceLow = Math.floor(85 / binSize);
    const voiceHigh = Math.ceil(300 / binSize);
    let voiceEnergy = 0;
    let voiceCount = 0;
    for (let i = voiceLow; i <= voiceHigh && i < freqData.length; i++) {
      voiceEnergy += freqData[i];
      voiceCount++;
    }
    const avgVoiceEnergy = voiceCount > 0 ? voiceEnergy / voiceCount : 0;

    // Typing: high energy in 200-800Hz with relatively low voice energy
    // (clicks are broadband impulses, not sustained tones)
    return avgTypingEnergy > 60 && avgTypingEnergy > avgVoiceEnergy * 1.5;
  }

  /**
   * Detect second speaker by looking for multiple pitch peaks in voice range.
   * If two distinct fundamental frequencies are present, likely two speakers.
   */
  private detectSecondSpeaker(freqData: Uint8Array): boolean {
    if (!this.audioContext) return false;

    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.WINDOW_SIZE;
    const lowBin = Math.floor(85 / binSize);
    const highBin = Math.ceil(400 / binSize);

    // Find peaks in voice range
    const peaks: { bin: number; val: number }[] = [];
    for (let i = lowBin + 1; i < highBin - 1 && i < freqData.length - 1; i++) {
      if (
        freqData[i] > freqData[i - 1] &&
        freqData[i] > freqData[i + 1] &&
        freqData[i] > 50
      ) {
        peaks.push({ bin: i, val: freqData[i] });
      }
    }

    if (peaks.length < 2) return false;

    // Sort by amplitude, check if top 2 peaks are far apart in frequency
    peaks.sort((a, b) => b.val - a.val);
    const freqDiff = Math.abs(peaks[0].bin - peaks[1].bin) * binSize;

    // Two strong peaks > 50Hz apart suggests two speakers
    return (
      freqDiff > 50 &&
      peaks[1].val > peaks[0].val * 0.4
    );
  }
}
