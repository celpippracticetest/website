"use client";

import * as Sentry from "@sentry/nextjs";

const { logger } = Sentry;

export default function SentryTestPage() {
    const triggerError = () => {
        logger.info("Test button clicked - about to trigger error");

        // This will trigger an error and send it to Sentry
        throw new Error("🧪 Sentry Test Error - This is a test!");
    };

    const triggerUndefinedFunction = () => {
        // @ts-ignore - intentionally calling undefined function
        myUndefinedFunction();
    };

    const testLogging = () => {
        logger.info("Testing Sentry logging");
        logger.warn("This is a warning message");
        logger.debug(logger.fmt`Current time: ${new Date().toISOString()}`);
    };

    const testSpan = () => {
        Sentry.startSpan(
            {
                op: "ui.action",
                name: "Test Span",
            },
            (span) => {
                logger.info("Span test started");
                span.setAttribute("test", "value");
                span.setAttribute("timestamp", Date.now());
                logger.info("Span test completed");
            }
        );
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
            <h1>🔧 Sentry Test Page</h1>
            <p>Click the buttons below to test your Sentry integration:</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" }}>
                <button
                    onClick={triggerError}
                    style={{
                        padding: "1rem",
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                    }}
                >
                    🚨 Trigger Test Error
                </button>

                <button
                    onClick={triggerUndefinedFunction}
                    style={{
                        padding: "1rem",
                        background: "#ea580c",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                    }}
                >
                    ⚠️ Trigger Undefined Function Error
                </button>

                <button
                    onClick={testLogging}
                    style={{
                        padding: "1rem",
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                    }}
                >
                    📝 Test Logging
                </button>

                <button
                    onClick={testSpan}
                    style={{
                        padding: "1rem",
                        background: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px",
                    }}
                >
                    ⏱️ Test Performance Span
                </button>
            </div>

            <div style={{ marginTop: "2rem", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                <h3>What to expect:</h3>
                <ul>
                    <li>🚨 <strong>Test Error</strong>: Sends an exception to Sentry Issues</li>
                    <li>⚠️ <strong>Undefined Function</strong>: Sends a different type of error</li>
                    <li>📝 <strong>Test Logging</strong>: Sends log messages to Sentry</li>
                    <li>⏱️ <strong>Performance Span</strong>: Creates a performance trace</li>
                </ul>
                <p style={{ marginTop: "1rem", fontSize: "14px", color: "#6b7280" }}>
                    After clicking a button, check your Sentry dashboard at{" "}
                    <a href="https://sentry.io" target="_blank" rel="noopener noreferrer">
                        sentry.io
                    </a>{" "}
                    → Issues
                </p>
            </div>
        </div>
    );
}
