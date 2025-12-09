/**
 * Time-related constants for the frontend application
 * All durations are in milliseconds unless otherwise specified
 */

export const TIME = {
    // Millisecond conversions
    ONE_SECOND_MS: 1000,
    ONE_MINUTE_MS: 60 * 1000,
    ONE_HOUR_MS: 60 * 60 * 1000,
    ONE_DAY_MS: 24 * 60 * 60 * 1000,
    ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,

    // Authentication & Session
    FRESH_LOGIN_FLAG_DURATION_MS: 10 * 1000, // 10 seconds
    SESSION_VALIDATION_DELAY_MS: 1000,

    // Socket Connection
    SOCKET_RECONNECT_DELAY_MS: 2000,
    SOCKET_RECONNECT_BACKOFF_MAX_MS: 30 * 1000, // 30 seconds
    SOCKET_CONNECTION_TIMEOUT_MS: 30 * 1000, // 30 seconds
    SOCKET_DISCONNECT_GRACE_PERIOD_MS: 2000,
    SOCKET_HANDSHAKE_TIMEOUT_MS: 5000,
    SOCKET_PING_TIMEOUT_MS: 3000,
    SOCKET_STATUS_CHECK_DELAY_MS: 500,
    SOCKET_JITTER_MAX_MS: 1000, // Max random jitter

    // Notifications
    NOTIFICATION_RETRY_DELAY_MS: 300,
    NOTIFICATION_POLL_INTERVAL_MS: 30 * 1000, // 30 seconds
    NOTIFICATION_THROTTLE_MS: 500,
    NOTIFICATION_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
    NOTIFICATION_DEDUP_WINDOW_MS: 3000,
    NOTIFICATION_CSRF_RETRY_DELAY_MS: 400,
    NOTIFICATION_FETCH_RETRY_DELAY_MS: 500,
    NOTIFICATION_MARK_READ_RETRY_DELAY_MS: 1000,
    NOTIFICATION_CLEANUP_CHECK_MS: 200,
    NOTIFICATION_STORAGE_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours
    NOTIFICATION_CACHE_CLEANUP_DELAY_MS: 10 * 1000, // 10 seconds after load

    // UI Delays
    DEBOUNCE_DEFAULT_MS: 300,
    TOAST_DURATION_MS: 5000,
    TOAST_DUPLICATE_WINDOW_MS: 5000,
    TOAST_CLEANUP_OLD_MS: 10 * 1000, // 10 seconds

    // Retry
    CSRF_RETRY_DELAY_MS: 500,
    API_RETRY_DELAY_MS: 1000,
} as const;

/**
 * Limit constants for the frontend
 */
export const LIMITS = {
    // File Upload
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_FILE_SIZE_MB: 10,

    // Pagination
    DEFAULT_PAGE_SIZE: 20,

    // Validation
    MIN_PASSWORD_LENGTH: 8,
    MAX_COMMENT_LENGTH: 5000,

    // Search
    MIN_SEARCH_LENGTH: 2,

    // Notifications
    MAX_LOCAL_NOTIFICATIONS: 100,
    MAX_RECENT_NOTIFICATION_CACHE: 100,
    NOTIFICATION_CACHE_CLEANUP_THRESHOLD: 100,
    NOTIFICATION_OLD_THRESHOLD_MS: 60 * 1000, // 1 minute

    // Socket
    MAX_SOCKET_RECONNECT_ATTEMPTS: 10,
} as const;

/**
 * Default values for various features
 */
export const DEFAULTS = {
    TIMEZONE: 'UTC',
    LANGUAGE: 'en',
    THEME: 'light',

    // Notification
    TOAST_DURATION: 5000,

    // Retry
    MAX_RETRIES: 3,
} as const;
