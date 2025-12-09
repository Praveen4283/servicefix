/**
 * Common type definitions for backend services
 * Replaces 'any' types with proper TypeScript interfaces
 */

// ============================================================================
// JWT & Authentication Types
// ============================================================================

export interface JWTPayload {
    userId: number;
    email: string;
    role: 'admin' | 'agent' | 'customer';
    organizationId?: number;
    iat?: number;  // Issued at
    exp?: number;  // Expiration
}

export interface RefreshTokenPayload extends JWTPayload {
    fingerprint?: string;
    tokenVersion?: number;
}

export interface AuthTokens {
    token: string;
    refreshToken?: string | null;
}

export interface AuthResponse extends AuthTokens {
    user: UserData;
}

// ============================================================================
// User Types
// ============================================================================

export interface UserData {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'agent' | 'customer';
    organizationId?: number;
    avatarUrl?: string;
    phoneNumber?: string;
    designation?: string;
    timezone?: string;
    language?: string;
    createdAt?: string;
    updatedAt?: string;
}

// ============================================================================
// Metadata Types (for models)
// ============================================================================

export interface NotificationMetadata {
    event_type?: string;
    ticket_id?: string | number;
    comment_id?: string | number;
    priority?: string;
    assignee_id?: string | number;
    link?: string;
    [key: string]: string | number | boolean | undefined;
}

export interface SLAMetadata {
    pause_reason?: string;
    paused_at?: string;
    resumed_at?: string;
    breach_count?: number;
    escalation_level?: number;
    previous_status?: string;
    status_change_reason?: string;
}

export interface ChatMetadata {
    context?: string;
    suggested_articles?: string[];
    confidence_score?: number;
    intent?: string;
    entities?: Record<string, unknown>;
}

export interface LogMetadata {
    userId?: number;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    error?: string;
    [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// Generic Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Dictionary<T> = Record<string, T>;

// For functions that need to accept unknown data and validate it
export type UnknownRecord = Record<string, unknown>;

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiSuccessResponse<T = unknown> {
    status: 'success';
    message?: string;
    data?: T;
}

export interface ApiErrorResponse {
    status: 'error';
    message: string;
    code?: string;
    errors?: Array<{
        field?: string;
        message: string;
        code?: string;
    }>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Database Query Types
// ============================================================================

export interface QueryResult<T = unknown> {
    rows: T[];
    rowCount: number;
    command: string;
}

export interface DatabaseRow {
    [key: string]: unknown;
}
