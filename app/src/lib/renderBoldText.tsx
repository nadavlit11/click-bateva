import type { ReactNode } from "react";

/**
 * Parses **bold** markdown syntax into React elements.
 * Splits text on ** delimiters and alternates between plain and bold spans.
 */
export function renderBoldText(text: string): ReactNode {
  const parts = text.split("**");
  // Unmatched ** (even split length = odd number of delimiters) — return as-is
  if (parts.length <= 1 || parts.length % 2 === 0) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}
