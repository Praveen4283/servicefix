/**
 * Error handling utilities for type-safe error handling
 */

/**
 * Check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as Record<string, unknown>).message);
    }
    return 'An unknown error occurred';
}

/**
 * Get error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
    if (isError(error)) {
        return error.stack;
    }
    return undefined;
}
