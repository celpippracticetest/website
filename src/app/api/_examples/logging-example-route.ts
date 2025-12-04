/**
 * API Route Logging Pattern
 * 
 * Example of how to use Sentry logging in Next.js API routes
 * Apply this pattern to all your API routes for consistent logging
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, captureException, trackAPICall, PerformanceTracker } from "@/lib/sentry-logger";

export async function GET(req: NextRequest) {
    const tracker = new PerformanceTracker("API: Get User Data", "api_route_example");

    try {
        // Log incoming request
        logger.info("GET request received", {
            component: "api_route_example",
            action: "get_request",
            metadata: {
                url: req.url,
                headers: Object.fromEntries(req.headers.entries()),
            },
        });

        // Your business logic here
        const data = { message: "Hello World" };

        // Track successful API call
        trackAPICall("GET", "/api/example", 200, {
            responseData: data,
        });

        // Finish performance tracking
        tracker.finish({ success: true });

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        // Capture exception with context
        captureException(error, {
            component: "api_route_example",
            action: "get_request_error",
            metadata: {
                url: req.url,
            },
        });

        tracker.finish({ success: false, error: error instanceof Error ? error.message : "Unknown error" });

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const tracker = new PerformanceTracker("API: Create User Data", "api_route_example");

    try {
        const body = await req.json();

        // Log with user context
        logger.info("POST request received", {
            component: "api_route_example",
            action: "post_request",
            userId: body.userId, // If available
            email: body.email, // If available
            metadata: {
                url: req.url,
                bodyKeys: Object.keys(body),
            },
        });

        // Your business logic here
        // ...

        // Log successful operation
        logger.info("Data created successfully", {
            component: "api_route_example",
            action: "data_created",
            userId: body.userId,
            metadata: {
                recordId: "some-id",
            },
        });

        trackAPICall("POST", "/api/example", 201, {
            created: true,
        });

        tracker.finish({ success: true });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        captureException(error, {
            component: "api_route_example",
            action: "post_request_error",
            metadata: {
                url: req.url,
            },
        });

        tracker.finish({ success: false });

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * Best Practices for API Route Logging:
 * 
 * 1. Always wrap route handlers in try-catch
 * 2. Use PerformanceTracker for timing operations
 * 3. Include userId/email when available for user context
 * 4. Log both successful operations and errors
 * 5. Use trackAPICall for endpoint-level tracking
 * 6. Include relevant metadata (IDs, counts, etc.)
 * 7. Use logger.info for successful operations
 * 8. Use captureException for errors
 * 9. Always specify component name (route file name)
 * 10. Use descriptive action names
 */
