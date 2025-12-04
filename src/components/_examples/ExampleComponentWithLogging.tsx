/**
 * Frontend Component Logging Example
 * 
 * How to add Sentry logging to React components
 */

"use client";

import { useEffect, useState } from "react";
import { logger, trackUserAction, captureException, PerformanceTracker } from "@/lib/sentry-logger";

export default function ExampleComponent() {
    const [data, setData] = useState(null);

    // Log component mount
    useEffect(() => {
        logger.info("Component mounted", {
            component: "ExampleComponent",
            action: "mount",
        });

        return () => {
            logger.info("Component unmounted", {
                component: "ExampleComponent",
                action: "unmount",
            });
        };
    }, []);

    // Track user interactions
    const handleButtonClick = () => {
        trackUserAction("button_click", "ExampleComponent", {
            buttonName: "submit",
        });

        // Your logic here
    };

    // Track data loading with performance
    const loadData = async () => {
        const tracker = new PerformanceTracker("Load Data", "ExampleComponent");

        try {
            logger.info("Loading data", {
                component: "ExampleComponent",
                action: "load_data_start",
            });

            const response = await fetch("/api/data");
            const result = await response.json();

            setData(result);

            logger.info("Data loaded successfully", {
                component: "ExampleComponent",
                action: "load_data_success",
                metadata: {
                    recordCount: result.length,
                },
            });

            tracker.finish({ success: true, count: result.length });
        } catch (error) {
            captureException(error, {
                component: "ExampleComponent",
                action: "load_data_error",
            });

            tracker.finish({ success: false });
        }
    };

    // Track form submission
    const handleSubmit = async (formData: any) => {
        try {
            trackUserAction("form_submit", "ExampleComponent", {
                formType: "contact",
            });

            logger.info("Submitting form", {
                component: "ExampleComponent",
                action: "form_submit",
                metadata: {
                    fields: Object.keys(formData),
                },
            });

            // Submit logic
            const response = await fetch("/api/submit", {
                method: "POST",
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                logger.info("Form submitted successfully", {
                    component: "ExampleComponent",
                    action: "form_submit_success",
                });
            } else {
                logger.error("Form submission failed", {
                    component: "ExampleComponent",
                    action: "form_submit_failed",
                    metadata: {
                        status: response.status,
                    },
                });
            }
        } catch (error) {
            captureException(error, {
                component: "ExampleComponent",
                action: "form_submit_error",
            });
        }
    };

    return (
        <div>
            <button onClick={handleButtonClick}>Click Me</button>
            {/* Your component JSX */}
        </div>
    );
}

/**
 * The logging utility automatically tags all frontend logs with:
 * - environment: "frontend"
 * - runtime: "browser"
 * - component: "ExampleComponent" (from your context)
 * 
 * In Sentry dashboard, you can filter by:
 * - environment:frontend (see all frontend logs)
 * - component:ExampleComponent (see logs from this specific component)
 */
