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

        // Replay configuration - captures user sessions
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.5,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        // Integrations - automatically capture console.log, console.warn, console.error
        integrations: [
            Sentry.consoleLoggingIntegration({
                levels: ["log", "warn", "error"]
            }),
        ],

        // Tag all events from client
        initialScope: {
            tags: {
                environment: "frontend",
                runtime: "browser",
            },
        },

        // Filter out noise
        ignoreErrors: [
            // Random plugins/extensions
            "top.GLOBALS",
            "originalCreateNotification",
            "canvas.contentDocument",
            "MyApp_RemoveAllHighlights",
            "http://tt.epicplay.com",
            "Can't find variable: ZiteReader",
            "jigsaw is not defined",
            "ComboSearch is not defined",
            "http://loading.retry.widdit.com/",
            "atomicFindClose",
            "fb_xd_fragment",
            "bmi_SafeAddOnload",
            "EBCallBackMessageReceived",
            "conduitPage",
            "Script error.",
            "AbortError: The operation was aborted",
            "NetworkError",
            "Failed to fetch",
        ],

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
