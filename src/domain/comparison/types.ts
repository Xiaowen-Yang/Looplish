export type DiffKind = "correct" | "missing" | "extra";

export interface DiffToken {
  kind: DiffKind;
  value: string;
}

export interface ComparisonResult {
  accuracy: number;
  correctWords: number;
  expectedWords: number;
  diff: DiffToken[];
}

