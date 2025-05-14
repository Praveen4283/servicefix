// Base URL for API requests
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

// File upload config
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip'
];

// Date format options
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATE_TIME_FORMAT = 'MMM dd, yyyy HH:mm';

// Token storage key
export const TOKEN_STORAGE_KEY = 'servicefix_auth_token';

// Refresh token interval (15 minutes)
export const REFRESH_TOKEN_INTERVAL = 15 * 60 * 1000; 