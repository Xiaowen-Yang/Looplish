import type { ProgressRecord } from "../domain/study/types";
import type { Sentence } from "../domain/transcript/types";
import { APP_CONFIG } from "../shared/config";

export class StudySession {
  private sentenceOrder: number;
  private completedIds: Set<string>;
  private rate: number;

  constructor(
    readonly videoId: string,
    readonly sentences: Sentence[],
    progress?: ProgressRecord
  ) {
    this.sentenceOrder = Math.min(
      Math.max(progress?.currentSentenceOrder ?? 0, 0),
      Math.max(sentences.length - 1, 0)
    );
    this.completedIds = new Set(progress?.completedSentenceIds ?? []);
    this.rate = progress?.playbackRate ?? APP_CONFIG.practice.defaultPlaybackRate;
  }

  get current(): Sentence | undefined {
    return this.sentences[this.sentenceOrder];
  }

  get currentOrder(): number {
    return this.sentenceOrder;
  }

  get playbackRate(): number {
    return this.rate;
  }

  get completedCount(): number {
    return this.completedIds.size;
  }

  move(offset: number): Sentence | undefined {
    this.sentenceOrder = Math.min(
      Math.max(this.sentenceOrder + offset, 0),
      Math.max(this.sentences.length - 1, 0)
    );
    return this.current;
  }

  setPlaybackRate(value: number): void {
    if (!Number.isFinite(value) || value < 0.5 || value > 2) {
      throw new Error("Playback rate must be between 0.5 and 2.");
    }
    this.rate = value;
  }

  completeCurrent(): void {
    if (this.current) {
      this.completedIds.add(this.current.id);
    }
  }

  isCompleted(sentenceId: string): boolean {
    return this.completedIds.has(sentenceId);
  }

  toProgress(updatedAt = Date.now()): ProgressRecord {
    return {
      videoId: this.videoId,
      currentSentenceOrder: this.sentenceOrder,
      playbackRate: this.rate,
      completedSentenceIds: [...this.completedIds],
      updatedAt
    };
  }
}

