import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set environment
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Tag all events from server
    initialScope: {
        tags: {
            environment: "server",
            runtime: "node",
        },
    },

    // Performance Monitoring

    beforeSend(event, hint) {
        // Filter out health check endpoints
        if (event.request?.url?.includes("/api/health")) {
            return null;
        }

        // Add additional server context
        if (event.contexts) {
            event.contexts.runtime = {
                name: "node",
                version: process.version,
            };
        }

        return event;
    },
});
