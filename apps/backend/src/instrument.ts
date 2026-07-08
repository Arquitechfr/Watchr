import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    "https://a2bb389559f2bc26e237b2e3a27146f5@o4511684973428736.ingest.de.sentry.io/4511684979458128",
  integrations: [nodeProfilingIntegration()],
  debug: true,
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",
});

export { Sentry };

console.log('SENTRY INITIALIZED');
