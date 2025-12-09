/**
 * Shared type definitions for backend code
 */

/**
 * Standard API error response
 */
export interface ApiError extends Error {
    message: string;
    statusCode?: number;
    code?: string;
    details?: unknown;
}

/**
 * Standard API response for success
 */
export interface ApiSuccessResponse<T = unknown> {
    status: 'success';
    data?: T;
    message?: string;
}

/**
 * Standard API response for error
 */
export interface ApiErrorResponse {
    status: 'error';
    message: string;
    error?: string;
    details?: unknown;
}

/**
 * Combined API response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Helper to create success response
 */
export function createSuccessResponse<T>(data?: T, message?: string): ApiSuccessResponse<T> {
    const response: ApiSuccessResponse<T> = {
        status: 'success'
    };
    if (data !== undefined) response.data = data;
    if (message) response.message = message;
    return response;
}

/**
 * Helper to create error response
 */
export function createErrorResponse(message: string, error?: string, details?: unknown): ApiErrorResponse {
    const response: ApiErrorResponse = {
        status: 'error',
        message
    };
    if (error) response.error = error;
    if (details) response.details = details;
    return response;
}
