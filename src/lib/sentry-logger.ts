/**
 * Sentry Logger Utility
 * 
 * Provides structured logging with automatic context enrichment including:
 * - Component names and line numbers
 * - Frontend/backend environment tagging
 * - User context integration
 * - Performance measurement
 */

import * as Sentry from "@sentry/nextjs";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogContext = {
    component?: string;
    action?: string;
    userId?: string;
    email?: string;
    metadata?: Record<string, any>;
    tags?: Record<string, string>;
};

/**
 * Get stack trace information to automatically capture component name and line number
 */
function getStackInfo(): { component: string; lineNumber: string; filePath: string } {
    const error = new Error();
    const stack = error.stack || "";
    const lines = stack.split("\n");

    // Get the calling function (skip this function and the logger function)
    const callerLine = lines[3] || "";

    // Extract file path and line number
    const match = callerLine.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);

    if (match) {
        const functionName = match[1] || "anonymous";
        const filePath = match[2] || "";
        const lineNumber = match[3] || "0";

        // Extract component name from file path
        const pathParts = filePath.split("/");
        const fileName = pathParts[pathParts.length - 1] || "";
        const component = fileName.replace(/\.(tsx?|jsx?)$/, "") || functionName;

        return {
            component,
            lineNumber,
            filePath,
        };
    }

    return {
        component: "unknown",
        lineNumber: "0",
        filePath: "unknown",
    };
}

/**
 * Main logging function
 */
export function log(
    level: LogLevel,
    message: string,
    context?: LogContext
) {
    const stackInfo = getStackInfo();
    const isServer = typeof window === "undefined";

    // Enrich context with automatic metadata
    const enrichedContext: LogContext = {
        component: context?.component || stackInfo.component,
        ...context,
        metadata: {
            ...context?.metadata,
            lineNumber: stackInfo.lineNumber,
            filePath: stackInfo.filePath,
            timestamp: new Date().toISOString(),
        },
        tags: {
            ...context?.tags,
            environment: isServer ? "backend" : "frontend",
            runtime: isServer ? "node" : "browser",
            component: context?.component || stackInfo.component,
        },
    };

    // Set Sentry context
    if (enrichedContext.userId || enrichedContext.email) {
        Sentry.setUser({
            id: enrichedContext.userId,
            email: enrichedContext.email,
        });
    }

    // Set tags
    if (enrichedContext.tags) {
        Sentry.setTags(enrichedContext.tags);
    }

    // Set additional context
    Sentry.setContext("log_context", {
        component: enrichedContext.component,
        action: enrichedContext.action,
        metadata: enrichedContext.metadata,
    });

    // Log to Sentry based on level
    switch (level) {
        case "debug":
            Sentry.captureMessage(message, "debug");
            if (process.env.NODE_ENV === "development") {
                console.debug(`[${enrichedContext.component}:${stackInfo.lineNumber}]`, message, enrichedContext);
            }
            break;
        case "info":
            Sentry.captureMessage(message, "info");
            console.log(`[${enrichedContext.component}:${stackInfo.lineNumber}]`, message, enrichedContext);
            break;
        case "warn":
            Sentry.captureMessage(message, "warning");
            console.warn(`[${enrichedContext.component}:${stackInfo.lineNumber}]`, message, enrichedContext);
            break;
        case "error":
            Sentry.captureMessage(message, "error");
            console.error(`[${enrichedContext.component}:${stackInfo.lineNumber}]`, message, enrichedContext);
            break;
        case "fatal":
            Sentry.captureMessage(message, "fatal");
            console.error(`[FATAL] [${enrichedContext.component}:${stackInfo.lineNumber}]`, message, enrichedContext);
            break;
    }
}

/**
 * Convenience logging methods
 */
export const logger = {
    debug: (message: string, context?: LogContext) => log("debug", message, context),
    info: (message: string, context?: LogContext) => log("info", message, context),
    warn: (message: string, context?: LogContext) => log("warn", message, context),
    error: (message: string, context?: LogContext) => log("error", message, context),
    fatal: (message: string, context?: LogContext) => log("fatal", message, context),
};

/**
 * Capture exception with context
 */
export function captureException(
    error: Error | unknown,
    context?: LogContext
) {
    const stackInfo = getStackInfo();
    const isServer = typeof window === "undefined";

    const enrichedContext: LogContext = {
        component: context?.component || stackInfo.component,
        ...context,
        metadata: {
            ...context?.metadata,
            lineNumber: stackInfo.lineNumber,
            filePath: stackInfo.filePath,
            timestamp: new Date().toISOString(),
        },
        tags: {
            ...context?.tags,
            environment: isServer ? "backend" : "frontend",
            runtime: isServer ? "node" : "browser",
            component: context?.component || stackInfo.component,
        },
    };

    // Set context
    if (enrichedContext.userId || enrichedContext.email) {
        Sentry.setUser({
            id: enrichedContext.userId,
            email: enrichedContext.email,
        });
    }

    if (enrichedContext.tags) {
        Sentry.setTags(enrichedContext.tags);
    }

    Sentry.setContext("error_context", {
        component: enrichedContext.component,
        action: enrichedContext.action,
        metadata: enrichedContext.metadata,
    });

    // Capture exception
    Sentry.captureException(error);

    console.error(`[${enrichedContext.component}:${stackInfo.lineNumber}]`, error, enrichedContext);
}

/**
 * Add breadcrumb for user actions
 */
export function addBreadcrumb(
    message: string,
    category: string = "user-action",
    data?: Record<string, any>
) {
    const stackInfo = getStackInfo();

    Sentry.addBreadcrumb({
        type: "user",
        category,
        message,
        level: "info",
        data: {
            ...data,
            component: stackInfo.component,
            lineNumber: stackInfo.lineNumber,
        },
    });
}

/**
 * Performance measurement utility
 */
export class PerformanceTracker {
    private startTime: number;
    private operation: string;
    private component: string;

    constructor(operation: string, component?: string) {
        this.startTime = performance.now();
        this.operation = operation;

        const stackInfo = getStackInfo();
        this.component = component || stackInfo.component;
    }

    finish(metadata?: Record<string, any>) {
        const duration = performance.now() - this.startTime;

        logger.info(`${this.operation} completed`, {
            component: this.component,
            action: this.operation,
            metadata: {
                ...metadata,
                durationMs: duration,
            },
            tags: {
                operation: this.operation,
            },
        });

        return duration;
    }
}

/**
 * Track user interaction
 */
export function trackUserAction(
    action: string,
    component: string,
    metadata?: Record<string, any>
) {
    addBreadcrumb(`User action: ${action}`, "user-interaction", {
        component,
        ...metadata,
    });

    logger.info(`User action: ${action}`, {
        component,
        action,
        metadata,
        tags: {
            action_type: "user_interaction",
        },
    });
}

/**
 * Track API call
 */
export function trackAPICall(
    method: string,
    endpoint: string,
    statusCode?: number,
    metadata?: Record<string, any>
) {
    const stackInfo = getStackInfo();

    addBreadcrumb(`API ${method} ${endpoint}`, "api-call", {
        method,
        endpoint,
        statusCode,
        ...metadata,
    });

    logger.info(`API call: ${method} ${endpoint}`, {
        component: stackInfo.component,
        action: "api_call",
        metadata: {
            method,
            endpoint,
            statusCode,
            ...metadata,
        },
        tags: {
            api_method: method,
            api_endpoint: endpoint,
            ...(statusCode && { status_code: statusCode.toString() }),
        },
    });
}
