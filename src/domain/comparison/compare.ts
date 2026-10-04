import type { ComparisonResult, DiffToken } from "./types";

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export function tokenize(value: string): string[] {
  return (value.normalize("NFKC").toLowerCase().match(WORD_PATTERN) ?? []).map(
    (word) => word.replace("’", "'")
  );
}

export function compareTranscript(
  expectedText: string,
  actualText: string
): ComparisonResult {
  const expected = tokenize(expectedText);
  const actual = tokenize(actualText);
  const rows = expected.length + 1;
  const columns = actual.length + 1;
  const lcs = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      lcs[row]![column] = expected[row - 1] === actual[column - 1]
        ? lcs[row - 1]![column - 1]! + 1
        : Math.max(lcs[row - 1]![column]!, lcs[row]![column - 1]!);
    }
  }

  const reversedDiff: DiffToken[] = [];
  let row = expected.length;
  let column = actual.length;

  while (row > 0 || column > 0) {
    if (
      row > 0 &&
      column > 0 &&
      expected[row - 1] === actual[column - 1]
    ) {
      reversedDiff.push({ kind: "correct", value: expected[row - 1]! });
      row -= 1;
      column -= 1;
    } else if (
      column > 0 &&
      (row === 0 || lcs[row]![column - 1]! >= lcs[row - 1]![column]!)
    ) {
      reversedDiff.push({ kind: "extra", value: actual[column - 1]! });
      column -= 1;
    } else {
      reversedDiff.push({ kind: "missing", value: expected[row - 1]! });
      row -= 1;
    }
  }

  const correctWords = lcs[expected.length]![actual.length]!;
  return {
    accuracy: expected.length === 0 ? (actual.length === 0 ? 1 : 0) : correctWords / expected.length,
    correctWords,
    expectedWords: expected.length,
    diff: reversedDiff.reverse()
  };
}

