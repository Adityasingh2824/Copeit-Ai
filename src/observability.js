import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

function sanitize(value, depth = 0) {
  if (depth > 3 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitize(item, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' && value.length > 256 ? '[redacted-long-string]' : value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const privateField = /authorization|cookie|token|password|secret|api.?key|email|file|source|document|content|rationale/i.test(key);
    return [key, privateField ? '[redacted]' : sanitize(item, depth + 1)];
  }));
}

export function initObservability() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    beforeSend(event) {
      const safe = {
        ...event,
        user: undefined,
        request: event.request ? { ...event.request, cookies: undefined, data: undefined, headers: undefined } : undefined,
        contexts: sanitize(event.contexts),
        extra: sanitize(event.extra),
        breadcrumbs: event.breadcrumbs?.map(crumb => ({ ...crumb, data: sanitize(crumb.data) })),
      };
      return safe;
    },
  });
}

export const ErrorBoundary = Sentry.ErrorBoundary;
