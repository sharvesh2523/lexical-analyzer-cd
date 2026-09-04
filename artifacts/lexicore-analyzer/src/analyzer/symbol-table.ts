import type { SymbolEntry, Token } from "./types";

const TYPE_WORDS = new Set([
  "char",
  "double",
  "float",
  "int",
  "long",
  "short",
  "signed",
  "unsigned",
  "void",
  "bool",
]);

function isTypeWord(token: Token | undefined) {
  return token?.type === "Keyword" && TYPE_WORDS.has(token.lexeme);
}

export function buildSymbolTable(tokens: Token[]): SymbolEntry[] {
  const symbols: SymbolEntry[] = [];
  let symbolId = 1;

  for (let index = 0; index < tokens.length; index += 1) {
    if (!isTypeWord(tokens[index])) continue;

    const typeWords = [tokens[index].lexeme];
    let cursor = index + 1;
    while (isTypeWord(tokens[cursor])) {
      typeWords.push(tokens[cursor].lexeme);
      cursor += 1;
    }

    while (cursor < tokens.length) {
      const candidate = tokens[cursor];
      if (candidate.type !== "Identifier") break;
      const following = tokens[cursor + 1];
      const entryType = typeWords.join(" ");
      let value = "—";
      let end = cursor + 1;

      if (following?.lexeme === "(") {
        value = "function";
      } else {
        if (following?.lexeme === "=") {
          const expression: string[] = [];
          let expressionCursor = cursor + 2;
          while (
            expressionCursor < tokens.length &&
            tokens[expressionCursor].lexeme !== "," &&
            tokens[expressionCursor].lexeme !== ";"
          ) {
            expression.push(tokens[expressionCursor].lexeme);
            expressionCursor += 1;
          }
          if (expression.length) value = expression.join(" ");
          end = expressionCursor;
        }
        symbols.push({
          id: symbolId,
          identifier: candidate.lexeme,
          type: entryType,
          line: candidate.line,
          value,
        });
        symbolId += 1;
      }

      if (tokens[end]?.lexeme === ",") {
        cursor = end + 1;
        continue;
      }
      break;
    }
  }

  return symbols;
}