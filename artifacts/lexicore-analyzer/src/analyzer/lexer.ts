import type { LexicalError, Token, TokenType } from "./types";

const KEYWORDS = new Set([
  "auto",
  "break",
  "case",
  "char",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extern",
  "float",
  "for",
  "goto",
  "if",
  "int",
  "long",
  "register",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "struct",
  "switch",
  "typedef",
  "union",
  "unsigned",
  "void",
  "volatile",
  "while",
  "bool",
  "inline",
  "restrict",
]);

const DELIMITERS = new Set(["(", ")", "{", "}", "[", "]", ";", ",", ":"]);
const OPERATORS = [
  ">>=",
  "<<=",
  "...",
  "->",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "<<",
  ">>",
  "&=",
  "|=",
  "^=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "<",
  ">",
  "!",
  "&",
  "|",
  "^",
  "~",
  "?",
  ".",
];

const OPERATOR_SET = new Set(OPERATORS);
const INVALID_CHARACTERS = new Set(["@", "$", "`"]);

function addError(
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

function isIdentifierStart(value: string) {
  return /[A-Za-z_]/.test(value);
}

function isIdentifierPart(value: string) {
  return /[A-Za-z0-9_]/.test(value);
}

function isDigit(value: string) {
  return /[0-9]/.test(value);
}

function isWhitespace(value: string) {
  return /\s/.test(value);
}

function readString(
  line: string,
  start: number,
  quote: "'" | '"',
): { lexeme: string; end: number; closed: boolean } {
  let index = start + 1;
  let escaped = false;
  while (index < line.length) {
    const char = line[index];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return { lexeme: line.slice(start, index + 1), end: index + 1, closed: true };
    }
    index += 1;
  }
  return { lexeme: line.slice(start), end: line.length, closed: false };
}

function readNumber(line: string, start: number) {
  let index = start;
  if (line.startsWith("0x", start) || line.startsWith("0X", start)) {
    index += 2;
    while (index < line.length && /[0-9A-Fa-f]/.test(line[index])) index += 1;
  } else {
    while (index < line.length && /[0-9]/.test(line[index])) index += 1;
    if (line[index] === ".") {
      index += 1;
      while (index < line.length && /[0-9]/.test(line[index])) index += 1;
    }
    if (line[index] === "e" || line[index] === "E") {
      index += 1;
      if (line[index] === "+" || line[index] === "-") index += 1;
      while (index < line.length && /[0-9]/.test(line[index])) index += 1;
    }
    if (/[fFlLuU]/.test(line[index] ?? "")) index += 1;
  }
  while (index < line.length && isIdentifierPart(line[index])) index += 1;
  return { lexeme: line.slice(start, index), end: index };
}

export function tokenize(
  cleanedSource: string,
  lineMap: number[],
): { tokens: Token[]; errors: LexicalError[] } {
  const tokens: Token[] = [];
  const errors: LexicalError[] = [];
  const lines = cleanedSource.length ? cleanedSource.split("\n") : [];
  let tokenId = 1;

  const addToken = (
    lexeme: string,
    type: TokenType,
    line: number,
    column: number,
  ) => {
    tokens.push({
      id: tokenId,
      line,
      column,
      lexeme,
      type,
      value: lexeme,
      status: "Valid",
      endColumn: column + Math.max(lexeme.length - 1, 0),
    });
    tokenId += 1;
  };

  lines.forEach((sourceLine, cleanedLineIndex) => {
    const displayLine = lineMap[cleanedLineIndex] ?? cleanedLineIndex + 1;
    let index = 0;
    while (index < sourceLine.length) {
      const char = sourceLine[index];
      const column = index + 1;

      if (isWhitespace(char)) {
        index += 1;
        continue;
      }

      if (char === "#" && (index === 0 || /^\s*$/.test(sourceLine.slice(0, index)))) {
        addToken(char, "Directive", displayLine, column);
        index += 1;
        continue;
      }

      if (isIdentifierStart(char)) {
        let end = index + 1;
        while (end < sourceLine.length && isIdentifierPart(sourceLine[end])) end += 1;
        const lexeme = sourceLine.slice(index, end);
        addToken(lexeme, KEYWORDS.has(lexeme) ? "Keyword" : "Identifier", displayLine, column);
        index = end;
        continue;
      }

      if (isDigit(char) || (char === "." && isDigit(sourceLine[index + 1] ?? ""))) {
        const { lexeme, end } = readNumber(sourceLine, index);
        const numericPart = /^(0[xX][0-9A-Fa-f]+|[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?[fFlLuU]?)$/.test(
          lexeme,
        );
        if (!numericPart) {
          addError(
            errors,
            displayLine,
            column,
            lexeme,
            "Invalid numeric literal",
            "The numeric literal contains characters that are not valid in C.",
          );
        } else {
          addToken(lexeme, "Literal", displayLine, column);
        }
        index = end;
        continue;
      }

      if (char === '"' || char === "'") {
        const result = readString(sourceLine, index, char);
        if (!result.closed) {
          addError(
            errors,
            displayLine,
            column,
            result.lexeme,
            char === '"' ? "Unterminated string literal" : "Unterminated character literal",
            `A ${char === '"' ? "string" : "character"} literal must close before the end of the line.`,
          );
        } else if (char === "'" && result.lexeme.length < 3) {
          addError(
            errors,
            displayLine,
            column,
            result.lexeme,
            "Invalid character literal",
            "A character literal must contain exactly one character.",
          );
        } else {
          addToken(result.lexeme, "Literal", displayLine, column);
        }
        index = result.end;
        continue;
      }

      const operator = OPERATORS.find((candidate) => sourceLine.startsWith(candidate, index));
      if (operator && OPERATOR_SET.has(operator)) {
        addToken(operator, "Operator", displayLine, column);
        index += operator.length;
        continue;
      }

      if (DELIMITERS.has(char)) {
        addToken(char, "Delimiter", displayLine, column);
        index += 1;
        continue;
      }

      if (INVALID_CHARACTERS.has(char)) {
        addError(
          errors,
          displayLine,
          column,
          char,
          "Invalid or unknown token",
          "This character is not valid in the supported C lexical grammar.",
        );
      } else {
        addError(
          errors,
          displayLine,
          column,
          char,
          "Invalid or unknown token",
          "The analyzer could not classify this symbol.",
        );
      }
      index += 1;
    }
  });

  return { tokens, errors };
}