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

// Define response type for consistent response structure
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  code?: string; // Add code field for error codes like CSRF_ERROR
}

// Define error type
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
  code?: string;
}

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
  private fetchingCsrfToken: Promise<void> | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Use environment variable for the API URL to make it configurable for different environments
    // The baseURL already includes /api in the environment variable
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    // Add debug for the base URL
    console.log(`[API Client] Using base URL: ${this.baseURL}`);
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      withCredentials: true // Enable sending cookies with cross-origin requests
    });

    // Add request interceptor for CSRF token
    this.client.interceptors.request.use(
      async (config) => {
        // Log the request URL for debugging
        console.log(`[API Client] Request URL: ${config.url}`);
        
        // Skip CSRF token for login, logout, and register
        if (config.url?.includes('/auth/login') || 
            config.url?.includes('/auth/logout') || 
            config.url?.includes('/auth/register')) {
          console.log(`[API Client] Skipping CSRF token for auth endpoint: ${config.url}`);
          return config;
        }
        
        // Skip CSRF token for GET requests
        if (config.method === 'get') {
          return config;
        }
        
        // Only add CSRF token for non-GET methods
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
            try {
            // Always fetch a fresh CSRF token for POST/PUT/PATCH/DELETE requests 
            // after successful login to ensure we have a valid token
                await this.fetchCsrfToken();

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
        // Handle 401 Unauthorized errors
        const originalRequest = error.config;
        
        // Handle CSRF token errors
        if (error.response?.status === 403 && 
            error.response?.data?.code === 'CSRF_ERROR') {
          console.log('[API Client] CSRF token error, fetching new token and retrying');
          
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            
            // Force refresh the CSRF token
            this.csrfToken = null;
            localStorage.removeItem('csrfToken');
            localStorage.removeItem('csrfTokenExpiry');
            
            try {
              await this.fetchCsrfToken();
              if (this.csrfToken && originalRequest.headers) {
                originalRequest.headers['x-csrf-token'] = this.csrfToken;
                return this.client(originalRequest);
              }
            } catch (csrfError) {
              console.error('[API Client] Failed to refresh CSRF token:', csrfError);
            }
          }
        }
        
        // Skip token refresh for public routes to prevent unnecessary auth calls
        if (this.isPublicRoute() && error.response?.status === 401) {
          console.log('[API Client] 401 on public route, skipping token refresh');
          return Promise.reject(error);
        }
        
        // Don't retry auth endpoints to prevent infinite loops
        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/refresh-token')) {
          
          originalRequest._retry = true;
          
          try {
            console.log('[API Client] Attempting to refresh token for 401 response');
            
            // Try to refresh the token - no need to send refresh token as it's in HttpOnly cookie
            const refreshResponse = await this.post('/auth/refresh-token', {});
            
            // If refresh successful, retry the original request
            if (refreshResponse && (refreshResponse.success || refreshResponse.status === 'success')) {
              console.log('[API Client] Token refreshed, retrying original request');
              
              // Force refresh the CSRF token after token refresh
              this.csrfToken = null;
              await this.fetchCsrfToken();
              
              // Dispatch event to update any UI components about the refreshed session
              window.dispatchEvent(new CustomEvent('auth:session-refreshed'));
              
              // Token is now stored in HttpOnly cookie, just retry the request
              if (this.csrfToken && originalRequest.headers) {
                originalRequest.headers['x-csrf-token'] = this.csrfToken;
              }
              return this.client(originalRequest);
            } else {
              // Token refresh failed
              console.warn('[API Client] Token refresh failed, logging out');
              this.handleAuthError();
            }
          } catch (refreshError) {
            console.error('[API Client] Error refreshing token:', refreshError);
            // If refresh fails, handle auth error
            this.handleAuthError();
          }
        }
        
        return Promise.reject(error);
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
   * Fetch a new CSRF token
   */
  private async fetchCsrfToken(): Promise<void> {
    // If we're already fetching a token, wait for that promise to resolve
    if (this.fetchingCsrfToken) {
      return this.fetchingCsrfToken;
    }
    
    // Create a new promise for fetching the token
    this.fetchingCsrfToken = (async () => {
    try {
      console.log('[API Client] Fetching CSRF token...');
      
      // Check if we have a cached token first
      const cachedToken = localStorage.getItem('csrfToken');
      const tokenExpiry = localStorage.getItem('csrfTokenExpiry');
      
      // Use cached token if it exists and isn't expired
      if (cachedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
        console.log('[API Client] Using cached CSRF token');
        this.csrfToken = cachedToken;
        return;
      }
      
      // Otherwise fetch a new token
      const response = await axios.get(`${this.baseURL}/auth/csrf-token`, {
        withCredentials: true,
        timeout: 5000 // 5 second timeout
      });
      
      if (response.data && response.data.csrfToken) {
        this.csrfToken = response.data.csrfToken;
        
          // Cache the token for a shorter time to ensure freshness
        if (this.csrfToken) {
          localStorage.setItem('csrfToken', this.csrfToken);
            localStorage.setItem('csrfTokenExpiry', (Date.now() + 5 * 60 * 1000).toString()); // 5 minutes
          
        console.log('[API Client] CSRF token fetched successfully');
        }
      } else {
        console.error('[API Client] CSRF token response missing token:', response.data);
          // Clear any existing token to avoid using stale tokens
          this.csrfToken = null;
          localStorage.removeItem('csrfToken');
          localStorage.removeItem('csrfTokenExpiry');
      }
    } catch (error) {
      console.error('[API Client] Error fetching CSRF token:', error);
      
      // Try to use cached token even if expired as fallback
      const cachedToken = localStorage.getItem('csrfToken');
      if (cachedToken) {
        console.log('[API Client] Using expired cached CSRF token as fallback');
        this.csrfToken = cachedToken;
        } else {
          // If no cached token available, clear token state
          this.csrfToken = null;
          localStorage.removeItem('csrfToken');
          localStorage.removeItem('csrfTokenExpiry');
      }
        
        throw error;
      } finally {
        // Clear the fetching promise when done
        this.fetchingCsrfToken = null;
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
      
      // No need to retrieve refresh token from localStorage as it's now in HttpOnly cookies
      console.log('[API Client] Handling auth error');
      
      // Call the auth/logout endpoint to clear the cookies server-side
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
          if (responseData && typeof responseData === 'object' && 'users' in responseData && Array.isArray((responseData as any).users)) {
            console.log(`[API Client] _get: Matched /users structure for ${url}. Returning data as is.`);
            return responseData as T; // responseData is already UsersResponse
          }
          console.warn(`[API Client] _get: /users at ${url} did NOT match expected structure. Data:`, responseData);
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
        
        // For non-auth endpoints, handle the standard structure
        const responseData = response as any; // Cast to any to avoid type checking errors
        
        if (responseData && typeof responseData === 'object') {
          if ('status' in responseData && responseData.status === 'success') {
            // If it has data property, return that
            if ('data' in responseData) {
              return responseData.data as T;
            }
            // Otherwise return the whole response
            return responseData as unknown as T;
          } else if ('status' in responseData && responseData.status === 'error') {
            throw new Error(responseData.message || 'Request failed');
          }
        }
        
        // Fallback for unexpected response format
        return responseData as T;
      });
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
        // Use normalizeUserResponse to handle potential inconsistencies
        const userDTO = this.normalizeUserResponse(response); 
        const user = mapUserDTOToUser(userDTO);
        return user;
      })
      .catch(error => {
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