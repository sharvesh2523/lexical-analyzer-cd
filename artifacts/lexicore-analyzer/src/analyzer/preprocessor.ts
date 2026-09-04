import type { LexicalError, PreprocessResult } from "./types";

function pushError(
  errors: LexicalError[],
  line: number,
  column: number,
  lexeme: string,
  errorType: string,
  description: string,
) {
  errors.push({
    id: errors.length + 1,
    line,
    column,
    lexeme,
    errorType,
    description,
  });
}

/**
 * Removes C comments while respecting strings and character literals. The
 * returned line map keeps diagnostics anchored to the user's original editor.
 */
export function preprocessSource(source: string): PreprocessResult {
  const originalLines = source.length === 0 ? 0 : source.split(/\r?\n/).length;
  const lines = source.split(/\r?\n/);
  const output: string[] = [];
  const lineMap: number[] = [];
  const errors: LexicalError[] = [];
  let commentsRemoved = 0;
  let blankLinesRemoved = 0;
  let inBlockComment = false;
  let blockStartLine = 1;
  let blockStartColumn = 1;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const sourceLine = lines[lineIndex];
    const lineNumber = lineIndex + 1;
    let cleaned = "";
    let quote: "'" | '"' | null = null;
    let escaped = false;

    for (let i = 0; i < sourceLine.length; i += 1) {
      const char = sourceLine[i];
      const next = sourceLine[i + 1];

      if (inBlockComment) {
        if (char === "*" && next === "/") {
          inBlockComment = false;
          commentsRemoved += 1;
          i += 1;
        }
        continue;
      }

      if (quote) {
        cleaned += char;
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        cleaned += char;
        continue;
      }

      if (char === "/" && next === "/") {
        commentsRemoved += 1;
        break;
      }

      if (char === "/" && next === "*") {
        inBlockComment = true;
        blockStartLine = lineNumber;
        blockStartColumn = i + 1;
        cleaned += " ";
        i += 1;
        continue;
      }

      cleaned += char;
    }

    const normalized = cleaned.replace(/\t/g, " ").trim();
    if (normalized.length === 0) {
      blankLinesRemoved += 1;
    } else {
      output.push(normalized);
      lineMap.push(lineNumber);
    }
  }

  if (inBlockComment) {
    pushError(
      errors,
      blockStartLine,
      blockStartColumn,
      "/*",
      "Unterminated comment",
      "A block comment was opened but no closing */ was found.",
    );
  }

  return {
    originalSource: source,
    cleanedSource: output.join("\n"),
    originalLines,
    cleanedLines: output.length,
    commentsRemoved,
    blankLinesRemoved,
    lineMap,
    errors,
  };
}