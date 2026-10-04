import { APP_CONFIG } from "../../shared/config";
import type {
  CaptionCue,
  Sentence,
  YouTubeTimedText
} from "./types";

const SENTENCE_END = /[.!?][\]"')]*$/u;

export function cleanCaptionText(value: string): string {
  return value
    .replace(/\n+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function parseYouTubeTimedText(payload: YouTubeTimedText): CaptionCue[] {
  return (payload.events ?? []).flatMap((event, index) => {
    const text = cleanCaptionText(
      (event.segs ?? []).map((segment) => segment.utf8 ?? "").join("")
    );

    if (!text || event.tStartMs === undefined) {
      return [];
    }

    const startTime = event.tStartMs / 1000;
    const duration = Math.max((event.dDurationMs ?? 0) / 1000, 0.1);

    return [{
      id: `cue-${index}`,
      startTime,
      endTime: startTime + duration,
      text
    }];
  });
}

function shouldCloseSentence(current: CaptionCue[], next?: CaptionCue): boolean {
  const first = current[0];
  const last = current.at(-1);

  if (!first || !last) {
    return false;
  }

  const duration = last.endTime - first.startTime;
  if (duration >= APP_CONFIG.practice.maximumSentenceSeconds) {
    return true;
  }

  if (SENTENCE_END.test(last.text) && duration >= APP_CONFIG.practice.minimumSentenceSeconds) {
    return true;
  }

  return Boolean(
    next && next.startTime - last.endTime > APP_CONFIG.practice.maximumCueGapSeconds
  );
}

export function groupCuesIntoSentences(
  cues: CaptionCue[],
  videoId: string
): Sentence[] {
  const sentences: Sentence[] = [];
  let current: CaptionCue[] = [];

  const flush = (): void => {
    const first = current[0];
    const last = current.at(-1);
    if (!first || !last) {
      return;
    }

    const order = sentences.length;
    sentences.push({
      id: `${videoId}:${order}`,
      videoId,
      order,
      startTime: first.startTime,
      endTime: last.endTime,
      text: cleanCaptionText(current.map((cue) => cue.text).join(" "))
    });
    current = [];
  };

  cues.forEach((cue, index) => {
    current.push(cue);
    if (shouldCloseSentence(current, cues[index + 1])) {
      flush();
    }
  });
  flush();

  return sentences;
}

