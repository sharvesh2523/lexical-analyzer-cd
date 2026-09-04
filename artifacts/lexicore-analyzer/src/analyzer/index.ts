import { tokenize } from "./lexer";
import { preprocessSource } from "./preprocessor";
import { buildSymbolTable } from "./symbol-table";
import type { AnalysisResult, LexicalError } from "./types";

export * from "./types";
export { preprocessSource } from "./preprocessor";
export { tokenize } from "./lexer";
export { buildSymbolTable } from "./symbol-table";

export function analyzeSource(source: string): AnalysisResult {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const preprocess = preprocessSource(source);
  const lexical = tokenize(preprocess.cleanedSource, preprocess.lineMap);
  const errors: LexicalError[] = [...preprocess.errors, ...lexical.errors].map(
    (error, index) => ({ ...error, id: index + 1 }),
  );
  const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    originalSource: source,
    cleanedSource: preprocess.cleanedSource,
    preprocess,
    tokens: lexical.tokens,
    errors,
    symbols: buildSymbolTable(lexical.tokens),
    processingTimeMs: Math.max(1, Math.round(endedAt - startedAt)),
  };
}