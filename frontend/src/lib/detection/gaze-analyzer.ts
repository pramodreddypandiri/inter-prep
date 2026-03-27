import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { GazeSignal } from "./types";

// MediaPipe FaceMesh landmark indices
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_INNER = 133;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;

interface GazePoint {
  yaw: number; // horizontal angle, negative = left
  pitch: number; // vertical angle, negative = up
  timestamp: number;
}

export class GazeAnalyzer {
  private landmarker: FaceLandmarker | null = null;
  private gazeHistory: GazePoint[] = [];
  private lastSignalTime = 0;
  private onSignal: ((signal: GazeSignal) => void) | null = null;
  private running = false;
  private videoElement: HTMLVideoElement | null = null;
  private rafId: number | null = null;

  // Configurable
  private readonly SIGNAL_INTERVAL_MS = 5000;
  private readonly ENTROPY_WINDOW_MS = 10000;
  private readonly SACCADE_THRESHOLD_DEG = 3; // degrees for a saccade
  private readonly SACCADE_SPEED_DEG_PER_S = 30; // rapid movement threshold

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.tlite",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  }

  start(video: HTMLVideoElement, onSignal: (signal: GazeSignal) => void): void {
    this.videoElement = video;
    this.onSignal = onSignal;
    this.running = true;
    this.lastSignalTime = Date.now();
    this.processFrame();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }

  private processFrame = (): void => {
    if (!this.running || !this.videoElement || !this.landmarker) return;

    if (
      this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      const now = performance.now();
      const results = this.landmarker.detectForVideo(this.videoElement, now);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        // Need at least 478 landmarks (468 face + 10 iris)
        if (landmarks.length >= 478) {
          const gaze = this.computeGaze(landmarks);
          this.gazeHistory.push(gaze);

          // Trim history to 30 seconds
          const cutoff = Date.now() - 30000;
          this.gazeHistory = this.gazeHistory.filter(
            (g) => g.timestamp > cutoff
          );
        }
      }

      // Emit signal every 5 seconds
      if (Date.now() - this.lastSignalTime >= this.SIGNAL_INTERVAL_MS) {
        this.emitSignal();
        this.lastSignalTime = Date.now();
      }
    }

    this.rafId = requestAnimationFrame(this.processFrame);
  };

  private computeGaze(
    landmarks: { x: number; y: number; z: number }[]
  ): GazePoint {
    // Left eye gaze
    const leftIris = landmarks[LEFT_IRIS_CENTER];
    const leftInner = landmarks[LEFT_EYE_INNER];
    const leftOuter = landmarks[LEFT_EYE_OUTER];
    const leftTop = landmarks[LEFT_EYE_TOP];
    const leftBottom = landmarks[LEFT_EYE_BOTTOM];

    const leftEyeCenterX = (leftInner.x + leftOuter.x) / 2;
    const leftEyeCenterY = (leftTop.y + leftBottom.y) / 2;
    const leftEyeWidth = Math.abs(leftInner.x - leftOuter.x);
    const leftEyeHeight = Math.abs(leftTop.y - leftBottom.y);

    const leftYaw =
      leftEyeWidth > 0
        ? ((leftIris.x - leftEyeCenterX) / leftEyeWidth) * 60
        : 0; // ~60° FOV mapped
    const leftPitch =
      leftEyeHeight > 0
        ? ((leftIris.y - leftEyeCenterY) / leftEyeHeight) * 40
        : 0;

    // Right eye gaze
    const rightIris = landmarks[RIGHT_IRIS_CENTER];
    const rightInner = landmarks[RIGHT_EYE_INNER];
    const rightOuter = landmarks[RIGHT_EYE_OUTER];
    const rightTop = landmarks[RIGHT_EYE_TOP];
    const rightBottom = landmarks[RIGHT_EYE_BOTTOM];

    const rightEyeCenterX = (rightInner.x + rightOuter.x) / 2;
    const rightEyeCenterY = (rightTop.y + rightBottom.y) / 2;
    const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x);
    const rightEyeHeight = Math.abs(rightTop.y - rightBottom.y);

    const rightYaw =
      rightEyeWidth > 0
        ? ((rightIris.x - rightEyeCenterX) / rightEyeWidth) * 60
        : 0;
    const rightPitch =
      rightEyeHeight > 0
        ? ((rightIris.y - rightEyeCenterY) / rightEyeHeight) * 40
        : 0;

    // Average both eyes
    return {
      yaw: (leftYaw + rightYaw) / 2,
      pitch: (leftPitch + rightPitch) / 2,
      timestamp: Date.now(),
    };
  }

  private emitSignal(): void {
    if (!this.onSignal) return;

    const now = Date.now();
    const windowPoints = this.gazeHistory.filter(
      (g) => g.timestamp > now - this.ENTROPY_WINDOW_MS
    );

    if (windowPoints.length < 3) {
      this.onSignal({
        entropy: 1,
        saccadeRate: 0,
        gazeAngleOffset: 0,
        readingPatternDetected: false,
        timestamp: now,
      });
      return;
    }

    const entropy = this.computeEntropy(windowPoints);
    const saccadeRate = this.computeSaccadeRate(windowPoints);
    const gazeAngleOffset = this.computeAvgOffset(windowPoints);
    const readingPatternDetected = this.detectReadingPattern(windowPoints);

    this.onSignal({
      entropy,
      saccadeRate,
      gazeAngleOffset,
      readingPatternDetected,
      timestamp: now,
    });
  }

  /**
   * Shannon entropy of gaze yaw distribution.
   * Low entropy = gaze clusters in narrow band = reading.
   */
  private computeEntropy(points: GazePoint[]): number {
    const BINS = 12;
    const MIN_YAW = -30;
    const MAX_YAW = 30;
    const binWidth = (MAX_YAW - MIN_YAW) / BINS;
    const counts = new Array(BINS).fill(0);

    for (const p of points) {
      const bin = Math.min(
        BINS - 1,
        Math.max(0, Math.floor((p.yaw - MIN_YAW) / binWidth))
      );
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

    // Normalize to 0–1 (max entropy = log2(BINS))
    return entropy / Math.log2(BINS);
  }

  /**
   * Count rapid horizontal eye movements (saccades) per second.
   */
  private computeSaccadeRate(points: GazePoint[]): number {
    if (points.length < 2) return 0;

    let saccadeCount = 0;
    for (let i = 1; i < points.length; i++) {
      const dt = (points[i].timestamp - points[i - 1].timestamp) / 1000;
      if (dt <= 0) continue;
      const dYaw = Math.abs(points[i].yaw - points[i - 1].yaw);
      const speed = dYaw / dt;

      if (
        dYaw >= this.SACCADE_THRESHOLD_DEG &&
        speed >= this.SACCADE_SPEED_DEG_PER_S
      ) {
        saccadeCount++;
      }
    }

    const windowDuration =
      (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
    return windowDuration > 0 ? saccadeCount / windowDuration : 0;
  }

  /**
   * Average absolute gaze offset from camera center.
   */
  private computeAvgOffset(points: GazePoint[]): number {
    if (points.length === 0) return 0;
    const totalOffset = points.reduce(
      (sum, p) => sum + Math.sqrt(p.yaw * p.yaw + p.pitch * p.pitch),
      0
    );
    return totalOffset / points.length;
  }

  /**
   * Detect reading pattern: horizontal saccades on a fixed vertical band.
   * Signature: low pitch variance + high yaw variance + repeated direction changes.
   */
  private detectReadingPattern(points: GazePoint[]): boolean {
    if (points.length < 10) return false;

    // Pitch variance (should be low for reading)
    const pitches = points.map((p) => p.pitch);
    const pitchMean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const pitchVar =
      pitches.reduce((sum, p) => sum + (p - pitchMean) ** 2, 0) /
      pitches.length;

    // Yaw variance (should be higher for reading)
    const yaws = points.map((p) => p.yaw);
    const yawMean = yaws.reduce((a, b) => a + b, 0) / yaws.length;
    const yawVar =
      yaws.reduce((sum, y) => sum + (y - yawMean) ** 2, 0) / yaws.length;

    // Direction changes in yaw
    let dirChanges = 0;
    for (let i = 2; i < yaws.length; i++) {
      const prev = yaws[i - 1] - yaws[i - 2];
      const curr = yaws[i] - yaws[i - 1];
      if (prev * curr < 0 && Math.abs(curr) > 1) {
        dirChanges++;
      }
    }

    // Reading = low pitch variance, significant yaw variance, multiple direction changes
    return pitchVar < 4 && yawVar > 9 && dirChanges >= 3;
  }
}
