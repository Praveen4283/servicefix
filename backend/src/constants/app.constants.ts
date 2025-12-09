/**
 * Time-related constants for the application
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
    CSRF_TOKEN_LIFETIME_MS: 24 * 60 * 60 * 1000, // 24 hours
    ACCESS_TOKEN_LIFETIME: '1h',
    REFRESH_TOKEN_LIFETIME: '7d',
    REFRESH_TOKEN_LIFETIME_DAYS: 7,
    SESSION_TIMEOUT_DEFAULT_MINUTES: 30,

    // Rate Limiting
    RATE_LIMIT_WINDOW_DEFAULT_MINUTES: 15,
    RATE_LIMIT_DEFAULT_PER_HOUR: 100,

    // Cache
    CACHE_DURATION_DEFAULT_MINUTES: 10,
    SLA_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes

    // Notifications
    NOTIFICATION_RETRY_DELAY_MS: 300,
    FRESH_LOGIN_FLAG_DURATION_MS: 10 * 1000, // 10 seconds

    // SLA
    SLA_CHECK_INTERVAL_MINUTES: 5,
    SLA_REVALIDATION_DELAY_MS: 1000,

    // Database
    DB_CONNECTION_TIMEOUT_MS: 5000,
    DB_IDLE_TIMEOUT_MS: 10000,

    // File Operations  
    FILE_UPLOAD_TIMEOUT_MS: 30 * 1000, // 30 seconds

    // Service Delays
    SERVICE_RETRY_DELAY_MS: 1000,
    SERVICE_BACKOFF_MAX_MS: 10 * 1000,
} as const;

/**
 * Limit constants for the application
 */
export const LIMITS = {
    // File Upload
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_FILE_SIZE_MB: 10,

    // Authentication
    MAX_LOGIN_ATTEMPTS_DEFAULT: 5,
    MIN_PASSWORD_LENGTH: 8,

    // Database
    DB_POOL_MIN_DEFAULT: 5,
    DB_POOL_MAX_DEFAULT: 20,

    // API
    MAX_REQUEST_SIZE: '50mb',

    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // Custom Fields
    MAX_CUSTOM_FIELDS_PER_TICKET_DEFAULT: 10,

    // Retry
    MAX_RETRIES_DEFAULT: 3,
} as const;

/**
 * Default values for various features
 */
export const DEFAULTS = {
    TIMEZONE: 'UTC',
    LANGUAGE: 'en',
    PRIORITY: 'medium',
    STATUS: 'new',

    // Email
    EMAIL_FROM_NAME: 'ServiceFix Support',

    // Settings
    PASSWORD_EXPIRY_DAYS: 90,
    CONCURRENT_FILE_UPLOADS: 3,
} as const;
