import * as Sentry from '@sentry/react';

interface ErrorContext {
  source: string;
  extra?: Record<string, unknown>;
}

export function reportError(error: unknown, context: ErrorContext): void {
  Sentry.captureException(error, { tags: { source: context.source }, extra: context.extra });
  console.error(`[${context.source}]`, error, context.extra ?? '');
}
