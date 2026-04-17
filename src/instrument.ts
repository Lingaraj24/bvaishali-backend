// Must be imported before any other module at the top of main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  // Capture 10% of traces in production; 100% in dev/staging
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Don't send events in development unless DSN is explicitly set
  enabled: !!process.env.SENTRY_DSN,
});
