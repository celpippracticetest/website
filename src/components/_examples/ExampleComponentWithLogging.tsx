/**
 * Official Sentry Logging - Frontend Component Example
 * 
 * Using official Sentry patterns:
 * - Direct logger from Sentry
 * - logger.fmt for template literals  
 * - Sentry.startSpan for UI performance tracking
 */

"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

const { logger } = Sentry;

export default function ExampleComponentWithLogging() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Log component lifecycle
    useEffect(() => {
        logger.info("Component mounted", {
            component: "ExampleComponent",
        });

        return () => {
            logger.debug("Component unmounted", {
                component: "ExampleComponent",
            });
        };
    }, []);

    // Track button click with span
    const handleButtonClick = () => {
        Sentry.startSpan(
            {
                op: "ui.click",
                name: "Example Button Click",
            },
            (span) => {
                logger.info("Button clicked", {
                    component: "ExampleComponent",
                    action: "button_click",
                });

                span.setAttribute("buttonType", "primary");
                span.setAttribute("component", "ExampleComponent");

                // Your logic here
                alert("Button clicked!");
            }
        );
    };

    // Track data loading with nested spans
    const loadData = async () => {
        return Sentry.startSpan(
            {
                op: "ui.action",
                name: "Load Data",
            },
            async (span) => {
                try {
                    setIsLoading(true);

                    logger.info("Loading data", {
                        component: "ExampleComponent",
                    });

                    // Nested span for API call
                    const result = await Sentry.startSpan(
                        {
                            op: "http.client",
                            name: "GET /api/data",
                        },
                        async (apiSpan) => {
                            const response = await fetch("/api/data");
                            const data = await response.json();

                            apiSpan.setAttribute("status", response.status);
                            apiSpan.setAttribute("recordCount", data.length || 0);

                            return data;
                        }
                    );

                    setData(result);

                    logger.info(logger.fmt`Data loaded successfully: ${result.length} records`);

                    span.setAttribute("success", true);
                    span.setAttribute("recordCount", result.length);
                } catch (error) {
                    Sentry.captureException(error);

                    logger.error("Failed to load data", {
                        component: "ExampleComponent",
                        error: error instanceof Error ? error.message : "Unknown error",
                    });

                    span.setAttribute("success", false);
                } finally {
                    setIsLoading(false);
                }
            }
        );
    };

    // Track form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        return Sentry.startSpan(
            {
                op: "ui.action",
                name: "Form Submit",
            },
            async (span) => {
                try {
                    const formData = new FormData(e.currentTarget);
                    const data = Object.fromEntries(formData);

                    logger.info("Form submitted", {
                        component: "ExampleComponent",
                        formType: "contact",
                        fields: Object.keys(data),
                    });

                    span.setAttribute("formType", "contact");
                    span.setAttribute("fieldCount", Object.keys(data).length);

                    // Submit logic
                    const response = await fetch("/api/submit", {
                        method: "POST",
                        body: JSON.stringify(data),
                    });

                    if (response.ok) {
                        logger.info("Form submitted successfully", {
                            component: "ExampleComponent",
                        });
                        span.setAttribute("success", true);
                    } else {
                        logger.warn("Form submission failed", {
                            component: "ExampleComponent",
                            status: response.status,
                        });
                        span.setAttribute("success", false);
                    }
                } catch (error) {
                    Sentry.captureException(error);

                    logger.error("Form submission error", {
                        component: "ExampleComponent",
                        error: error instanceof Error ? error.message : "Unknown error",
                    });

                    span.setAttribute("success", false);
                }
            }
        );
    };

    return (
        <div>
            <h1>Sentry Logging Example</h1>

            <button onClick={handleButtonClick}>
                Track Button Click
            </button>

            <button onClick={loadData} disabled={isLoading}>
                {isLoading ? "Loading..." : "Load Data"}
            </button>

            {data && <div>Loaded {data.length} records</div>}

            <form onSubmit={handleSubmit}>
                <input name="name" placeholder="Name" />
                <input name="email" placeholder="Email" />
                <button type="submit">Submit Form</button>
            </form>
        </div>
    );
}

/**
 * Official Sentry Patterns Used:
 * 
 * 1. Import: import * as Sentry from "@sentry/nextjs"
 * 2. Logger: const { logger } = Sentry
 * 3. UI Spans: Sentry.startSpan({ op: "ui.click", name }, (span) => {...})
 * 4. API Spans: Sentry.startSpan({ op: "http.client", name }, async (span) => {...})
 * 5. Exceptions: Sentry.captureException(error)
 * 6. Template literals: logger.fmt`Message: ${variable}`
 * 
 * All logs automatically tagged with:
 * - environment: "frontend" (from sentry.client.config.ts)
 * - runtime: "browser"
 * 
 * Spans are nested for hierarchy:
 * - Parent: "Load Data" (ui.action)
 *   - Child: "GET /api/data" (http.client)
 */
