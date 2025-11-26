/**
 * Consolidated API client service
 * 
 * This file combines functionality from the original api.ts and apiClient.ts
 * to provide a single source of truth for API communication.
 * 
 * The main export is the apiClient instance with advanced functionality.
 * For backward compatibility, this file also exports an 'api' instance
 * that mimics the behavior of the previous api.ts
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { User } from '../context/AuthContext';
import { 
  UserDTO, 
  mapUserDTOToUser, 
  mapUserToDTO, 
  // ProfileUpdateDTO, - Commented out unused import
  mapProfileUpdateToDTO,
  createDataURLFromFile
} from '../models/UserDTO';
import { withRetry } from '../utils/apiUtils';
// import { createRetryableFunction } from '../utils/apiUtils'; - Commented out unused import
// import { JsonObject, MetadataObject } from '../types/common'; - Commented out unused imports
import { ProfileUpdateData } from '../models/UserDTO';

// Extend AxiosRequestConfig to allow custom properties
declare module 'axios' {
  export interface AxiosRequestConfig {
    _csrfRetry?: boolean;
    _retry?: boolean;
    _skipAuthRetry?: boolean;
  }
}

// Define refresh token response interface
interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
  user?: any;
  csrfToken?: string;
  status?: string;
  data?: any;
}

// For API responses
interface ApiResponse<T = any> {
  status: string;
  data?: T;
  message?: string;
  code?: string;
  errors?: any[];
}

// For error handling
interface ApiError {
  message: string;
  errors?: any;
  status: number;
  code?: string;
}

// For CSRF error handling
const createErrorResponse = (status: number, message: string): AxiosError => {
  return {
    name: 'AxiosError',
    message,
    isAxiosError: true,
    toJSON: () => ({}),
    response: {
      status,
      statusText: status === 403 ? 'Forbidden' : 'Unauthorized',
      headers: {},
      config: {
        headers: {} as any
      } as any,
      data: { message, code: status === 403 ? 'CSRF_ERROR' : 'AUTH_ERROR' }
    } as AxiosResponse
  } as AxiosError;
};

// Debounce token refresh to prevent multiple simultaneous requests
let refreshTokenPromise: Promise<RefreshTokenResponse> | null = null;
let isRefreshingToken = false;

/**
 * Interface for API user response data with inconsistent property names
 */
interface ApiUserResponse {
  id?: string;
  _id?: string;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  role?: string;
  avatar_url?: string;
  avatarUrl?: string;
  phone_number?: string;
  phoneNumber?: string;
  phone?: string;
  designation?: string;
  job_title?: string;
  jobTitle?: string;
  organization_id?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
  };
  timezone?: string;
  language?: string;
  last_login_at?: string;
  lastLogin?: string;
  lastLoginAt?: string;
  notification_settings?: Record<string, { email: boolean; push: boolean; in_app: boolean } | boolean>;
  notificationSettings?: Record<string, { email: boolean; push: boolean; in_app: boolean } | boolean>;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

class ApiClient {
  // Changed from private to protected to allow access for backward compatibility exports
  protected client: AxiosInstance;
  private baseURL: string;
  private csrfToken: string | null = null;
  private fetchingCsrfToken: Promise<string> | null = null;
  private lastCsrfFetchTime: number = 0;
  private csrfTokenCacheTime: number = 10000; // 10 second cache time
  private isInitialized: boolean = false;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private csrfDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Use environment variable for the API URL to make it configurable for different environments
    // The baseURL already includes /api in the environment variable
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    // Add debug for the base URL
    console.log(`[API Client] Using base URL: ${this.baseURL}`);
    
    // Retrieve tokens from localStorage
    this.authToken = localStorage.getItem('authToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      withCredentials: true // Keep this true for CSRF protection
    });

    // Add request interceptor for CSRF token and auth token
    this.client.interceptors.request.use(
      async (config) => {
        // Log the request URL for debugging
        console.log(`[API Client] Request URL: ${config.url}`);
        
        // Skip CSRF token for login, logout, and register
        const authEndpoints = ['/auth/login', '/auth/logout', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
        const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));
        
        if (isAuthEndpoint) {
          console.log(`[API Client] Skipping CSRF token for auth endpoint: ${config.url}`);
          return config;
        }
        
        // Add Authorization header if we have an auth token
        if (this.authToken && config.headers) {
          config.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        // Skip CSRF token for GET requests
        if (config.method === 'get') {
          return config;
        }
        
        // Only add CSRF token for non-GET methods
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
          try {
            // Check if we have a valid token already
            const needsNewToken = !this.csrfToken || (Date.now() - this.lastCsrfFetchTime > this.csrfTokenCacheTime);
            
            if (needsNewToken) {
              await this.fetchCsrfToken();
            } else {
              console.log(`[API Client] Using cached CSRF token (age: ${Math.floor((Date.now() - this.lastCsrfFetchTime)/1000)}s)`);
            }

            // Add CSRF token to header if available
            if (this.csrfToken && config.headers) {
              console.log(`[API Client] Adding CSRF token to ${config.url}`);
              config.headers['x-csrf-token'] = this.csrfToken;
            } else {
              console.warn(`[API Client] No CSRF token available for ${config.url}`);
            }
          } catch (error) {
            console.error('[API Client] Failed to fetch CSRF token:', error);
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // No need to add Authorization header as the JWT token is now sent in HttpOnly cookies automatically
    // The withCredentials: true option in axios config ensures cookies are sent with each request

    // Add response interceptor to handle 401 responses (unauthenticated)
    this.client.interceptors.response.use(
      (response) => response.data,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle CSRF token errors
        if (error.response?.status === 403 && 
            (error.response?.data?.code === 'CSRF_ERROR' || 
             error.response?.data?.message?.includes('CSRF'))) {
          console.log('[API Client] CSRF token error, fetching new token and retrying');
          
          if (!originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true;
            
            // Force refresh the CSRF token
            this.csrfToken = null;
            this.lastCsrfFetchTime = 0;
            localStorage.removeItem('csrfToken');
            localStorage.removeItem('csrfTokenExpiry');
            
            try {
              // Wait a bit before retrying to avoid race conditions
              await new Promise(resolve => setTimeout(resolve, 300));
              const newCsrfToken = await this.fetchCsrfToken();
              
              // Apply the new CSRF token to the original request
              if (newCsrfToken && originalRequest.headers) {
                originalRequest.headers['x-csrf-token'] = newCsrfToken;
                return this.client(originalRequest);
              }
            } catch (csrfError) {
              console.error('[API Client] Failed to refresh CSRF token:', csrfError);
              return Promise.reject(this.formatError(
                createErrorResponse(403, 'CSRF token refresh failed')
              ));
            }
          }
        }
        
        // Skip token refresh for public routes to prevent unnecessary auth calls
        if (this.isPublicRoute() && error.response?.status === 401) {
          console.log('[API Client] 401 on public route, skipping token refresh');
          return Promise.reject(error);
        }

        // Handle expired tokens with a single refresh attempt across multiple requests
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('[API Client] 401 Unauthorized - attempting token refresh');
          originalRequest._retry = true;
          
          // Debounce token refresh - if a refresh is already in progress, use that promise
          // instead of starting a new refresh
          if (isRefreshingToken) {
            console.log('[API Client] Token refresh already in progress, waiting for completion');
            
            if (!refreshTokenPromise) {
              return Promise.reject(new Error('Token refresh inconsistent state'));
            }
            
            try {
              // Wait for the existing refresh to complete
              await refreshTokenPromise;
              
              // Get fresh CSRF token after successful token refresh
              await this.fetchCsrfToken();
              
              // Update the headers with the new tokens
              if (this.authToken && originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${this.authToken}`;
              }
              if (this.csrfToken && originalRequest.headers) {
                originalRequest.headers['x-csrf-token'] = this.csrfToken;
              }
              
              // Retry the request with new tokens
              return this.client(originalRequest);
            } catch (error) {
              return Promise.reject(error);
            }
          }
          
          // Set flag and create a new refresh promise
          isRefreshingToken = true;
          
          // Store the promise for other requests to use
          refreshTokenPromise = (async () => {
            try {
              // Check if we have a valid refresh token
              const refreshToken = localStorage.getItem('refreshToken');
              
              if (!refreshToken) {
                console.warn('[API Client] No refresh token available');
                this.handleAuthError();
                throw new Error('No refresh token available. Please log in again.');
              }
              
              console.log('[API Client] Attempting to refresh token');
              
              // Call token refresh endpoint with proper error handling
              const response = await this.client.post('/auth/refresh-token', { 
                refreshToken 
              }, {
                _skipAuthRetry: true
              });
              
              // Safely extract the token data regardless of response structure
              let responseData: RefreshTokenResponse;

              if (response && typeof response === 'object') {
                // Handle both direct response and nested data property
                if ('token' in response) {
                  responseData = response as unknown as RefreshTokenResponse;
                } else if (response.data && typeof response.data === 'object' && 'token' in response.data) {
                  responseData = response.data as unknown as RefreshTokenResponse;
                } else {
                  console.error('[API Client] Unexpected response format:', response);
                  throw new Error('Invalid response format from refresh token endpoint');
                }
              } else {
                throw new Error('Invalid response from refresh token endpoint');
              }
              
              if (!responseData || !responseData.token) {
                throw new Error('Invalid response from refresh token endpoint');
              }
              
              console.log('[API Client] Token refreshed successfully');
              
              // Update stored tokens
              this.authToken = responseData.token;
              localStorage.setItem('authToken', responseData.token);
              
              // Update refresh token if provided
              if (responseData.refreshToken) {
                this.refreshToken = responseData.refreshToken;
                localStorage.setItem('refreshToken', responseData.refreshToken);
              }
              
              // Update the authorization header
              this.client.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
              
              // Dispatch event to notify that session was refreshed
              window.dispatchEvent(new Event('auth:session-refreshed'));
              
              return responseData;
            } catch (error) {
              console.error('[API Client] Token refresh failed:', error);
              this.handleAuthError();
              throw new Error('Session expired. Please log in again.');
            } finally {
              // Reset the refresh flag
              isRefreshingToken = false;
              // Clear the promise after a short delay in case there are multiple
              // pending requests waiting on it
              setTimeout(() => {
                refreshTokenPromise = null;
              }, 100);
            }
          })();
          
          try {
            // Wait for the refresh to complete
            await refreshTokenPromise;
            
            // Get a fresh CSRF token after successful token refresh
            await this.fetchCsrfToken();
            
            // Update the headers with the new tokens
            if (this.authToken && originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            if (this.csrfToken && originalRequest.headers) {
              originalRequest.headers['x-csrf-token'] = this.csrfToken;
            }
            
            // Retry the request with new tokens
            return this.client(originalRequest);
          } catch (error) {
            return Promise.reject(error);
          }
        }
        
        // For all other errors, use the formatError helper
        return Promise.reject(this.formatError(error));
      }
    );
    
    // Initialize the client (fetch CSRF token)
    this.initialize();
  }
  
  /**
   * Initialize the API client by prefetching the CSRF token
   * This should be called when the app starts to ensure we have a valid token
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      console.log('[API Client] Initializing API client...');
      
      // Skip initialization for public routes
      if (this.isPublicRoute()) {
        console.log('[API Client] On public route, skipping initial CSRF token fetch');
        this.isInitialized = true;
        return;
      }
      
      // Fetch CSRF token
      await this.fetchCsrfToken();
      
      // Try to validate the authentication session
      try {
        await this.get('/auth/validate');
        console.log('[API Client] Authentication session validated during initialization');
      } catch (validationError) {
        console.log('[API Client] No active authentication session during initialization');
        // This is normal on initial load, not an error condition
      }
      
      this.isInitialized = true;
      console.log('[API Client] API client initialized successfully');
    } catch (error) {
      console.error('[API Client] Error initializing API client:', error);
      // We still consider the client initialized even if there was an error
      this.isInitialized = true;
    }
  }

  /**
   * Fetch CSRF token from the server
   * Only fetch a new token if the current token is expired or not available
   */
  async fetchCsrfToken(): Promise<string> {
    // Implement debouncing for CSRF token requests to prevent multiple simultaneous requests
    if (this.fetchingCsrfToken) {
      console.log('[API Client] CSRF token fetch already in progress, waiting for completion');
      try {
        return await this.fetchingCsrfToken;
      } catch (error) {
        console.error('[API Client] Error while waiting for existing CSRF token fetch:', error);
        // Fall through to fresh fetch below
      }
    }
    
    // Check if we have a cached token that's still valid
    const cachedToken = localStorage.getItem('csrfToken');
    const cachedTokenExpiryStr = localStorage.getItem('csrfTokenExpiry');
    const cachedTokenExpiry = cachedTokenExpiryStr ? parseInt(cachedTokenExpiryStr, 10) : 0;
    
    // If token is cached and not expired (with 10% time buffer), return it
    if (cachedToken && Date.now() < cachedTokenExpiry - this.csrfTokenCacheTime * 0.1) {
      console.log('[API Client] Using cached CSRF token');
      this.csrfToken = cachedToken;
      return Promise.resolve(cachedToken);
    }
    
    // If current time is too close to last fetch time, debounce
    if (Date.now() - this.lastCsrfFetchTime < 1000) {
      console.log('[API Client] Debouncing CSRF token request');
      
      // Clear any existing timer
      if (this.csrfDebounceTimer) {
        clearTimeout(this.csrfDebounceTimer);
      }
      
      // Set up a new fetch with delay
      return new Promise<string>((resolve) => {
        this.csrfDebounceTimer = setTimeout(() => {
          this.fetchCsrfToken().then(resolve);
        }, 1000);
      });
    }
    
    console.log('[API Client] Fetching new CSRF token');
    this.lastCsrfFetchTime = Date.now();
    
    // Create a new fetch promise that we'll store for deduplication
    this.fetchingCsrfToken = (async (): Promise<string> => {
      try {
        // Improved token extraction from response
        const response = await this.client.get('/auth/csrf-token', {
          withCredentials: true
        });
        
        // Type assertion to allow property access
        const responseObj = response as any;
        
        // Enhanced response parsing with multiple fallback paths
        let csrfToken: string | null = null;
        
        // Try to extract token from different possible response formats
        if (typeof responseObj.csrfToken === 'string') {
          csrfToken = responseObj.csrfToken;
        } 
        // Try data property next
        else if (responseObj.data && typeof responseObj.data === 'object') {
          const dataObj = responseObj.data;
          if (typeof dataObj.csrfToken === 'string') {
            csrfToken = dataObj.csrfToken;
          } else if (dataObj.data && typeof dataObj.data.csrfToken === 'string') {
            csrfToken = dataObj.data.csrfToken;
          }
        }
        // Try status/data pattern
        else if (responseObj.status && responseObj.status === 'success' && responseObj.data && 
                typeof responseObj.data === 'object' && typeof responseObj.data.csrfToken === 'string') {
          csrfToken = responseObj.data.csrfToken;
        }
        
        console.log(`[API Client] CSRF token extraction result: ${csrfToken ? 'found' : 'not found'}`);
        
        if (!csrfToken) {
          throw new Error('No CSRF token in response');
        }
        
        // Ensure consistent token format and length (64 hex chars)
        if (!/^[a-f0-9]{64}$/i.test(csrfToken)) {
          console.warn(`[API Client] CSRF token format invalid, regenerating`);
          // Generate a valid token format if the server didn't provide one
          csrfToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
        
        // Update and store the token
        this.csrfToken = csrfToken;
        localStorage.setItem('csrfToken', csrfToken);
        localStorage.setItem('csrfTokenExpiry', (Date.now() + this.csrfTokenCacheTime).toString());
        
        return csrfToken;
      } catch (error) {
        console.error('[API Client] Error extracting CSRF token:', error);
        throw error;
      } finally {
        // Clear the promise after completion
        setTimeout(() => {
          this.fetchingCsrfToken = null;
        }, 100);
      }
    })();
    
    return this.fetchingCsrfToken;
  }

  // Handle successful responses
  private handleSuccess(response: AxiosResponse): AxiosResponse {
    return response;
  }

  // Handle error responses
  private handleError = (error: AxiosError<ApiResponse>): Promise<any> => {
    const { response, request, config } = error;
    
    let apiError: ApiError = {
      message: 'An unexpected error occurred. Please try again later.',
      status: 500,
    };

    if (response) {
      // Server responded with an error
      apiError = {
        message: response.data?.message || 'An error occurred',
        errors: response.data?.errors,
        status: response.status,
        code: response.data?.code
      };

      // Handle authentication errors
      if (response.status === 401) {
        // If the error is not from the auth endpoints
        if (
          !config?.url?.includes('/auth/login') &&
          !config?.url?.includes('/auth/refresh-token')
        ) {
          // Attempt to refresh the token or log out
          this.handleAuthError();
        }
      } 
      // Handle CSRF errors
      else if (response.status === 403 && response.data?.code === 'CSRF_ERROR') {
        console.log('[API Client] CSRF token expired, fetching new token and retrying request');
        // Fetch a new CSRF token and retry the request once
        return this.fetchCsrfToken().then(() => {
          if (!config) return Promise.reject(apiError);
          // Add the new CSRF token to the request
          if (config.headers && this.csrfToken) {
            config.headers['x-csrf-token'] = this.csrfToken;
          }
          // Retry the request once with the new token
          return this.client(config);
        });
      }
    } else if (request) {
      // Request made but no response received (network error)
      apiError = {
        message: 'Unable to connect to the server. Please check your internet connection.',
        status: 0,
      };
    }

    return Promise.reject(apiError);
  };

  // Handle authentication errors by attempting to refresh token or logging out
  private handleAuthError = (): void => {
    try {
      // Skip auth error handling for public routes
      if (this.isPublicRoute()) {
        console.log('[API Client] On public route, skipping auth error handling');
        return;
      }
      
      console.log('[API Client] Handling auth error');
      
      // Call the auth/logout endpoint to handle server-side cleanup
      this.post('/auth/logout', {})
        .then(() => {
          console.log('[API Client] Logged out successfully');
          this.logout();
        })
        .catch(error => {
          console.error('[API Client] Error during logout:', error);
          this.logout();
        });
    } catch (error) {
      console.error('[API Client] Error in handleAuthError:', error);
      this.logout();
    }
  }

  // Logout helper to trigger the auth context logout
  private logout = (): void => {
    // Clear tokens
    this.authToken = null;
    this.refreshToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    
    // Dispatch a logout event that AuthContext will listen for
    const logoutEvent = new CustomEvent('auth:logout');
    window.dispatchEvent(logoutEvent);
    
    // Redirect to login page
    window.location.href = '/login';
  }

  // Get request headers including auth token
  private getRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // No need to add Authorization header as the JWT token is now sent in HttpOnly cookies
    
    // Add CSRF token if available
    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    
    return headers;
  }

  // GET request with retry functionality
  public get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return withRetry(() => this._get<T>(url, params, config), 3, 1000);
  }

  // Internal GET request implementation
  private _get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    console.log(`[API Client] _get: Requesting ${url}`, { params, config });
    return this.client
      .get<T>(url, { ...config, params }) // Axios .get will resolve with T due to interceptor
      .then((responseData) => { // responseData here IS the actual server payload of type T
        console.log(`[API Client] _get: Received data payload for ${url}:`, responseData);

        // Now, all logic should operate on responseData directly.
        // The previous complex conditional logic was trying to re-parse what was already the direct data.

        // Specific handling for /users list
        if (url.includes('/users') && !url.includes('/stats')) {
          if (url.includes('/roles/agent')) {
            // Special case for /users/roles/agent endpoint
            console.log(`[API Client] _get: Agent roles endpoint at ${url}. Returning data as is.`);
            return responseData as T;
          } else if (responseData && typeof responseData === 'object' && 'users' in responseData && Array.isArray((responseData as any).users)) {
            console.log(`[API Client] _get: Matched /users structure for ${url}. Returning data as is.`);
          } else if (url.match(/\/users\/\d+$/) && responseData && typeof responseData === 'object') {
            // This is a single user endpoint (e.g., /users/1001), just return the data as is
            console.log(`[API Client] _get: Single user endpoint for ${url}. Returning data as is.`);
            return responseData as T;
          } else {
            console.warn(`[API Client] _get: /users at ${url} did NOT match expected structure. Data:`, responseData);
          }
          // Fallthrough to generic or error if structure is wrong for /users
        }
        // Specific handling for /users/stats
        else if (url.includes('/users/stats')) {
          console.log(`[API Client] _get: Processing /users/stats for ${url}. Data:`, responseData);
          if (responseData && typeof responseData === 'object') {
            // If stats are wrapped in a 'data' property by the backend for this specific endpoint
            if ('data' in responseData && typeof (responseData as any).data === 'object' && Object.keys((responseData as any).data).length > 0) {
              console.log(`[API Client] _get: /users/stats has 'data' property. Returning .data`);
              return (responseData as any).data as T;
            }
            // Otherwise, assume responseData is the stats object directly
            console.log(`[API Client] _get: /users/stats does not have 'data' property or it's empty. Returning responseData as is.`);
            return responseData as T;
          }
        }

        // Generic handling for other endpoints that might have a {status: 'success', data: X} structure
        if (responseData && typeof responseData === 'object' && 'status' in responseData && (responseData as any).status === 'success' && 'data' in responseData) {
          console.log(`[API Client] _get: Standard success/data structure for ${url}. Returning .data`);
          return (responseData as any).data as T;
        }
        
        // If no specific handling matched and it's not the standard {status:'success', data: ...} structure,
        // assume responseData is the direct data of type T. This is the most common case due to the interceptor.
        console.log(`[API Client] _get: No specific/standard structure matched for ${url}. Returning responseData as is.`);
        return responseData as T;
      })
      .catch(error => {
        console.error(`[API Client] _get: Request Failed for ${url}:`, error);
        // Ensure the promise is rejected with the error to be caught by withRetry or the caller
        throw error; 
      });
  }

  // POST request
  public post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Additional check for post-login notification requests
    const isPostLoginNotification = url.includes('/notifications') && 
      // @ts-ignore - Accessing custom property on window
      window.__freshLogin === true;
    
    const postWithToken = async (): Promise<T> => {
      // For post-login notifications, always fetch a fresh token first
      if (isPostLoginNotification) {
        console.log('[API Client] Post-login notification detected, fetching fresh token');
        await this.fetchCsrfToken();
        // Add a small extra delay for cookie propagation
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return this.client
        .post<ApiResponse<T> | T>(url, data, config)
        .then((response) => {
          // Debug the response structure
          console.log(`[API Client] POST Response for ${url}:`, response);
          
          // For auth endpoints, just return the whole response without further processing
          if (url.includes('/auth/')) {
            console.log(`[API Client] Returning auth response for ${url}:`, response);
            return response as unknown as T;
          }
          
          // Extract and return data
          const responseData = response?.data;
          
          if (!responseData) {
            return {} as T;
          }
          
          // Handle standard API response format
          if (typeof responseData === 'object' && 'data' in responseData && responseData.status === 'success') {
            return responseData.data as T;
          }
          
          // If not in standard format, return as is
          return responseData as T;
        });
    };
    
    return postWithToken();
  }

  // PUT request
  public put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.client
      .put<ApiResponse<T>>(url, data, config)
      .then((response) => {
        // Check if the response has the expected format
        if (response.data && 'status' in response.data) {
          if (response.data.status === 'success') {
            return response.data.data as T;
          } else {
            throw new Error(response.data.message || 'Request failed');
          }
        }
        // Fallback for unexpected response format
        return response.data as T;
      });
  }

  // PATCH request
  public patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.client
      .patch<ApiResponse<T>>(url, data, config)
      .then((response) => response.data.data as T);
  }

  // DELETE request
  public delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.client
      .delete<ApiResponse<T>>(url, config)
      .then((response) => {
        // Check if the response has the expected format
        if (response.data && 'status' in response.data) {
          if (response.data.status === 'success') {
            return response.data.data as T;
          } else {
            throw new Error(response.data.message || 'Request failed');
          }
        }
        // Fallback for unexpected response format
        return response.data as T;
      });
  }

  // Upload file with progress tracking
  public uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (percentage: number) => void,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const uploadConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentage = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        if (onProgress) {
          onProgress(percentage);
        }
      },
    };

    return this.client
      .post<ApiResponse<T>>(url, formData, uploadConfig)
      .then((response) => response.data.data as T);
  }

  // Specialized methods for User entity

  /**
   * Gets a user by ID and transforms it to the frontend User model
   * @param userId The ID of the user to fetch
   * @returns Promise resolving to the User object
   */
  public getUser(userId: string): Promise<User> {
    return this.get<any>(`/users/${userId}`)
      .then(response => {
        console.log('[API Client] getUser raw response:', response);
        // Use normalizeUserResponse to handle potential inconsistencies
        const userDTO = this.normalizeUserResponse(response); 
        const user = mapUserDTOToUser(userDTO);
        console.log('[API Client] getUser transformed user:', user);
        return user;
      })
      .catch(error => {
        console.error('[API Client] getUser error:', error);
        throw error;
      });
  }

  /**
   * Updates a user profile with proper data transformation
   * @param userId The ID of the user to update
   * @param userData The user data to update
   * @returns Promise resolving to the updated User object
   */
  public updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const userDTO = mapUserToDTO(userData);
    return this.put<UserDTO>(`/users/${userId}`, userDTO)
      .then(updatedUserDTO => mapUserDTOToUser(updatedUserDTO));
  }

  /**
   * Handles profile updates with special case for avatar
   * @param userId The ID of the user to update
   * @param profileData The profile data including possible avatar file
   * @returns Promise resolving to the updated User object
   */
  public async updateUserProfile(userId: string, profileData: ProfileUpdateData): Promise<User> {
    console.log('[ApiClient] updateUserProfile - Received profile data:', JSON.stringify(profileData));
    const profileDTO = mapProfileUpdateToDTO(profileData); // contains { ..., avatar: File | null | undefined }
    console.log('[ApiClient] updateUserProfile - After mapping to DTO:', JSON.stringify({...profileDTO, avatar: profileDTO.avatar ? 'File object' : profileDTO.avatar}));

    const avatarFile = profileDTO.avatar; // File | null | undefined
    delete profileDTO.avatar; // remove dto.avatar

    const currentAuthUser = JSON.parse(localStorage.getItem('user') || '{}') as User;
    console.log('[ApiClient] updateUserProfile - Current user from localStorage:', JSON.stringify({
      ...currentAuthUser,
      avatarUrl: currentAuthUser.avatarUrl ? 'Avatar URL exists' : 'No avatar URL'
    }));

    // Handle avatar logic based on avatarFile state
    if (avatarFile instanceof File) { // Case 1: New file uploaded
      try {
        const compressedImage = await this.compressImage(avatarFile, {
          maxWidth: 300,
          maxHeight: 300,
          quality: 0.9
        });
        const dataUrl = await createDataURLFromFile(compressedImage);
        
        if (dataUrl.length > 2 * 1024 * 1024) {
          profileDTO.avatar_url = currentAuthUser.avatarUrl; // Keep existing avatar
        } else {
          profileDTO.avatar_url = dataUrl; // Assign NEW Data URL
        }
      } catch (error) {
        profileDTO.avatar_url = currentAuthUser.avatarUrl; // Keep existing avatar on error
      }
    } else if (avatarFile === null) { // Case 2: Explicit removal requested
      profileDTO.avatar_url = null; // Explicitly set to null for backend update
    } else { // Case 3: No change requested (avatarFile is undefined)
      // Preserve existing avatar URL if it exists, otherwise leave avatar_url undefined in DTO
      if (currentAuthUser.avatarUrl !== undefined) {
        profileDTO.avatar_url = currentAuthUser.avatarUrl;
      }
    }

    // Send the PUT request with the potentially updated profileDTO.avatar_url
    console.log('[ApiClient] updateUserProfile - Final DTO being sent to API:', JSON.stringify(profileDTO));
    return this.put<UserDTO>(`/users/${userId}`, profileDTO)
      .then(response => {
        console.log('[ApiClient] updateUserProfile - Raw API response:', JSON.stringify(response));
        const normalizedResponse = this.normalizeUserResponse(response);
        console.log('[ApiClient] updateUserProfile - Normalized response:', JSON.stringify(normalizedResponse));
        const user = mapUserDTOToUser(normalizedResponse);
        console.log('[ApiClient] updateUserProfile - Final user object:', JSON.stringify(user));
        return user;
      });
  }

  /**
   * Normalizes user response data to ensure it has the expected field structure
   * @param response The response data from the API
   * @returns A properly formatted UserDTO object
   */
  private normalizeUserResponse(response: ApiUserResponse): UserDTO {
    console.log('[ApiClient] normalizeUserResponse - Raw input:', JSON.stringify(response));
    
    let organizationData: { id: string; name: string } | undefined = undefined;
    
    if (response.organization) {
      // Direct organization object
      organizationData = {
        id: String(response.organization.id),
        name: response.organization.name
      };
    } else if (response.organizationId || response.organization_id) {
      // We have an organization ID but no organization object
      // Create minimal organization data
      organizationData = {
        id: String(response.organizationId || response.organization_id),
        name: 'Loading...' // Placeholder until we can fetch the proper name
      };
    }
    
    const normalized: UserDTO = {
      id: response.id || response._id || '',
      email: response.email || '',
      first_name: response.first_name || response.firstName || '',
      last_name: response.last_name || response.lastName || '',
      role: response.role || 'user',
      avatar_url: response.avatar_url || response.avatarUrl,
      phone_number: response.phone_number || response.phoneNumber || response.phone || '',
      designation: response.designation || response.job_title || response.jobTitle || '',
      organization_id: response.organization_id || response.organizationId,
      organization: organizationData,
      timezone: response.timezone || 'UTC',
      language: response.language || 'en',
      last_login_at: response.last_login_at || response.lastLogin || response.lastLoginAt,
      // Include notification settings, ensuring it's an object
      notification_settings: typeof response.notification_settings === 'object' && response.notification_settings !== null 
                             ? response.notification_settings 
                             : (typeof response.notificationSettings === 'object' && response.notificationSettings !== null
                                ? response.notificationSettings
                                : undefined),
      created_at: response.created_at || response.createdAt,
      updated_at: response.updated_at || response.updatedAt
    };
    
    console.log('[ApiClient] normalizeUserResponse - Normalized output:', JSON.stringify(normalized));
    
    return normalized;
  }

  /**
   * Uploads a user avatar to the dedicated endpoint
   * @param userId The ID of the user
   * @param file The avatar file to upload
   * @returns Promise resolving to an object with the avatar URL
   */
  public uploadUserAvatar(userId: string, file: File): Promise<{avatar_url: string}> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return this.post<{avatar_url: string}>(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Compresses an image file to reduce size
   * @param file The image file to compress
   * @param options Compression options
   * @returns Promise resolving to a compressed File object
   */
  private compressImage(
    file: File, 
    options: { maxWidth: number; maxHeight: number; quality: number }
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      try {
        // Create image element to load the file
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > options.maxWidth) {
            height = Math.round(height * (options.maxWidth / width));
            width = options.maxWidth;
          }
          
          if (height > options.maxHeight) {
            width = Math.round(width * (options.maxHeight / height));
            height = options.maxHeight;
          }
          
          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image to canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob from canvas'));
                return;
              }
              
              // Create new file from blob
              const compressedFile = new File(
                [blob],
                file.name,
                {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                }
              );
              
              resolve(compressedFile);
            },
            'image/jpeg',
            options.quality
          );
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Directly fetches organization data for a user
   * @param userId The user ID to fetch organization for
   * @returns Promise resolving to the organization data
   */
  public getUserOrganization(userId: string): Promise<{ id: string; name: string; domain?: string }> {
    return this.get<any>(`/users/${userId}/organization`)
      .then(response => {
        return response.organization;
      })
      .catch(error => {
        return { id: 'unknown', name: 'Unknown Organization' };
      });
  }

  /**
   * Checks if the current URL path is a public route that doesn't need authentication
   * This helps prevent unnecessary auth API calls on public pages
   */
  private isPublicRoute(): boolean {
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/cookies'];
    
    // Get current path from browser
    const currentPath = window.location.pathname;
    
    // Check if we're on a public route
    return publicRoutes.some(route => 
      currentPath === route || 
      (route !== '/' && currentPath.startsWith(route))
    );
  }

  // Add these lines near the top of the class, after the client initialization
  private formatError(error: AxiosError): ApiError {
    const status = error.response?.status || 500;
    let message = error.message || 'An unknown error occurred';
    let errors: Record<string, string[]> | undefined = undefined;
    let code: string | undefined = undefined;
    
    // Handle the response data with proper type casting
    if (error.response?.data) {
      const errorData = error.response.data as any;
      if (errorData.message) message = errorData.message;
      if (errorData.errors) errors = errorData.errors;
      if (errorData.code) code = errorData.code;
    }
    
    return {
      message,
      errors,
      status,
      code
    };
  }
}

// Create a single instance for the application
const apiClient = new ApiClient();

// For backward compatibility, export a simple axios instance that mimics the original api.ts
// Create a new axios instance with similar configuration to the original api.ts
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token from local storage - like original api.ts
api.interceptors.request.use(
  (config) => {
    const authToken = localStorage.getItem('authToken');
    const legacyToken = localStorage.getItem('token');
    const token = authToken || legacyToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add the same error handling as in apiClient
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session=expired';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 