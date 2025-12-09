/**
 * Common type definitions to replace 'any' usage throughout the application
 */

// Generic record type for JSON objects
export type JsonObject = Record<string, unknown>;

// Function prop types
export type EventCallback = () => void;
export type ValueChangeCallback<T> = (value: T) => void;
export type ErrorCallback = (error: Error) => void;

// Common component prop types
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

// Theme-related types
export interface ThemeUtils {
  palette: {
    mode: 'light' | 'dark';
    primary: { main: string };
    secondary: { main: string };
    error: { main: string };
    warning: { main: string };
    success: { main: string };
    background: { paper: string; default: string };
    divider: string;
    text: { primary: string; secondary: string };
  };
}

// Metadata type for services
export interface MetadataObject {
  [key: string]: string | number | boolean | null | undefined | string[] | MetadataObject;
}

// File upload-related types
export interface FileUploadResult {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

// API response types
export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Search-related types
export interface SearchParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

// Error types
export interface AppError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, string[]>;
}

// ============================================================================
// API Response Types (Auth-specific)
// ============================================================================

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'customer';
  organizationId?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  designation?: string;
  timezone?: string;
  language?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  notificationSettings?: Record<string, { email: boolean; push: boolean; in_app: boolean } | boolean>;
}

export interface ApiSuccessResponse<T = unknown> {
  status: 'success';
  message?: string;
  data?: T;
  user?: ApiUser;
  token?: string;
  refreshToken?: string;
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

// Socket event types
export interface SocketNotification {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
  metadata?: MetadataObject;
}