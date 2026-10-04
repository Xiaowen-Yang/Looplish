export const APP_CONFIG = {
  name: "Looplish",
  database: {
    name: "looplish",
    version: 1
  },
  practice: {
    replayLeadSeconds: 0.15,
    replayTailSeconds: 0.1,
    defaultPlaybackRate: 1,
    minimumSentenceSeconds: 0.8,
    maximumSentenceSeconds: 12,
    maximumCueGapSeconds: 1.25
  },
  youtube: {
    hostname: "www.youtube.com",
    watchPath: "/watch"
  }
} as const;

