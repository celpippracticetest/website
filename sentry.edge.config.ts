import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn: dsn,

        // Enable logs - required for logger to work
        enableLogs: true,

        // Set environment
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

        // Adjust this value in production
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

        // Setting this option to true will print useful information to the console
        debug: false,

        // Tag all events from edge
        initialScope: {
            tags: {
                environment: "edge",
                runtime: "edge",
            },
        },

        beforeSend(event, hint) {
            // Filter out health check endpoints
            if (event.request?.url?.includes("/api/health")) {
                return null;
            }

            return event;
        },
    });
} else {
    console.warn("Sentry DSN not found. Sentry initialization skipped.");
}
