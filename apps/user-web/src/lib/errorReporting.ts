interface ErrorContext {
  source: string;
  extra?: Record<string, unknown>;
}

export function reportError(error: unknown, context: ErrorContext): void {
  console.error(`[${context.source}]`, error, context.extra ?? '');
}
