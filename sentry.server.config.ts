import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn: dsn,

        // Enable logs - required for logger to work
        enableLogs: true,

        // Set environment
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        // Integrations - automatically capture console.log, console.warn, console.error
        integrations: [
            Sentry.consoleLoggingIntegration({
                levels: ["log", "warn", "error"]
            }),
        ],

        // Tag all events from server
        initialScope: {
            tags: {
                environment: "backend",
                runtime: "node",
            },
        },

        beforeSend(event, hint) {
            // Filter out health check endpoints
            if (event.request?.url?.includes("/api/health")) {
                return null;
            }

            // Add server context
            if (event.contexts) {
                event.contexts.runtime = {
                    name: "node",
                    version: process.version,
                };
            }

            return event;
        },
    });
} else {
    console.warn("Sentry DSN not found. Sentry initialization skipped.");
}
