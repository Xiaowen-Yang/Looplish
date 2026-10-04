import type { CaptionTrackSummary } from "../../shared/messages";
import { withJson3Format } from "./playerResponse";

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export function isTokenizedCaptionRequest(value: string): boolean {
  const url = parseUrl(value);
  if (!url || !url.pathname.includes("/api/timedtext")) {
    return false;
  }

  return url.searchParams.has("pot") || url.searchParams.has("potc");
}

export function findTokenizedCaptionUrl(
  resourceUrls: string[],
  track: CaptionTrackSummary
): string | undefined {
  const preferredLanguage = track.languageCode.toLowerCase();

  return [...resourceUrls]
    .reverse()
    .filter(isTokenizedCaptionRequest)
    .map(parseUrl)
    .find((url) => {
      const requestLanguage = url?.searchParams.get("lang")?.toLowerCase();
      return requestLanguage === preferredLanguage;
    })
    ?.toString();
}

export function getCaptionResourceUrls(
  entries: PerformanceEntry[] = performance.getEntriesByType("resource")
): string[] {
  return entries.map((entry) => entry.name);
}

export function asJson3CaptionUrl(value: string): string {
  return withJson3Format(value);
}

