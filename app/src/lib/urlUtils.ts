/**
 * Validate a URL string and return it only if it uses http(s) protocol.
 * Returns null for empty, invalid, or non-http(s) URLs.
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    return null;
  } catch { return null; }
}
