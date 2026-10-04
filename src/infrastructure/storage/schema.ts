export const STORAGE_SCHEMA = {
  stores: {
    videos: "videos",
    sentences: "sentences",
    attempts: "attempts",
    progress: "progress"
  },
  indexes: {
    sentencesByVideo: "by-video",
    attemptsBySentence: "by-sentence"
  }
} as const;

