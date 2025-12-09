// Environment variables from .env files are loaded by CRA
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';

// Full API URL with version
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Use legacy unversioned URL if explicitly configured
const LEGACY_API_URL = process.env.REACT_APP_USE_LEGACY_API === 'true'
  ? `${API_BASE_URL}/api`
  : API_URL;

// System settings
const config = {
  // API URLs
  api: {
    baseUrl: API_BASE_URL,
    url: API_URL,
    // Use the appropriate API URL based on configuration
    // Default to versioned API
    endpoints: {
      auth: {
        login: `${LEGACY_API_URL}/auth/login`,
        register: `${LEGACY_API_URL}/auth/register`,
        refreshToken: `${LEGACY_API_URL}/auth/refresh-token`,
        logout: `${LEGACY_API_URL}/auth/logout`,
        forgotPassword: `${LEGACY_API_URL}/auth/forgot-password`,
        resetPassword: `${LEGACY_API_URL}/auth/reset-password`,
        changePassword: `${LEGACY_API_URL}/auth/change-password`,
      },
      users: {
        profile: `${API_URL}/users/profile`,
        list: `${API_URL}/users`,
        detail: (id: string) => `${API_URL}/users/${id}`,
        update: (id: string) => `${API_URL}/users/${id}`,
        delete: (id: string) => `${API_URL}/users/${id}`,
      },
      tickets: {
        list: `${API_URL}/tickets`,
        create: `${API_URL}/tickets`,
        detail: (id: string) => `${API_URL}/tickets/${id}`,
        update: (id: string) => `${API_URL}/tickets/${id}`,
        delete: (id: string) => `${API_URL}/tickets/${id}`,
        comments: (id: string) => `${API_URL}/tickets/${id}/comments`,
        attachments: (id: string) => `${API_URL}/tickets/${id}/attachments`,
      },
      csrfToken: `${API_URL}/csrf-token`,
    },
  },

  // Feature flags
  features: {
    darkMode: true,
    fileAttachments: true,
    notifications: true,
    csrfProtection: process.env.REACT_APP_CSRF_PROTECTION !== 'false',
  },

  // Limits and constraints
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxAttachments: 5,
    ticketsPerPage: 20,
  },

  // Supported file types
  acceptedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
  ],
};

export default config; 