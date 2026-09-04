export type TokenType =
  | "Keyword"
  | "Identifier"
  | "Operator"
  | "Literal"
  | "Delimiter"
  | "Directive";

export type PipelineStatus = "pending" | "processing" | "completed" | "error";

export interface Token {
  id: number;
  line: number;
  column: number;
  lexeme: string;
  type: TokenType;
  value: string;
  status: "Valid";
  endColumn: number;
}

export interface LexicalError {
  id: number;
  line: number;
  column: number;
  lexeme: string;
  errorType: string;
  description: string;
}

export interface SymbolEntry {
  id: number;
  identifier: string;
  type: string;
  line: number;
  value: string;
}

export interface PreprocessResult {
  originalSource: string;
  cleanedSource: string;
  originalLines: number;
  cleanedLines: number;
  commentsRemoved: number;
  blankLinesRemoved: number;
  lineMap: number[];
  errors: LexicalError[];
}

export interface AnalysisResult {
  originalSource: string;
  cleanedSource: string;
  preprocess: PreprocessResult;
  tokens: Token[];
  errors: LexicalError[];
  symbols: SymbolEntry[];
  processingTimeMs: number;
}