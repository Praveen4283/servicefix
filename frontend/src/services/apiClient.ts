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
  ProfileUpdateDTO,
  mapProfileUpdateToDTO,
  createDataURLFromFile
} from '../models/UserDTO';
import { withRetry, createRetryableFunction } from '../utils/apiUtils';

// Define response type for consistent response structure
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Define error type
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

class ApiClient {
  // Changed from private to protected to allow access for backward compatibility exports
  protected client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use environment variable for the API URL to make it configurable for different environments
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        // Check for tokens with both key names for backward compatibility
        const authToken = localStorage.getItem('authToken');
        const legacyToken = localStorage.getItem('token');
        const token = authToken || legacyToken;
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (!(config.data instanceof FormData)) {
          config.headers['Content-Type'] = 'application/json';
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add special interceptor for ticket assignments
    this.client.interceptors.request.use(
      (config) => {
        // Check if this is a PUT request to update a ticket
        if (config.method === 'put' && config.url?.includes('/tickets/') && config.data) {
          // Make a copy of the data to avoid mutating the original
          const data = { ...config.data };
          
          // If assigneeId is present, ensure it's a number or null
          if ('assigneeId' in data) {
            console.log('API Client - Original assigneeId:', data.assigneeId, typeof data.assigneeId);
            
            if (data.assigneeId === null || data.assigneeId === undefined) {
              // Keep null/undefined as is
            } else if (typeof data.assigneeId === 'string') {
              // Check if this is a UUID format (contains letters)
              if (/[a-zA-Z]/.test(data.assigneeId)) {
                console.log('Found UUID format, setting to default numeric ID');
                // Must be a numeric ID for PostgreSQL bigint column
                data.assigneeId = 1001; // Default safe ID based on schema
              } else {
                // Try to convert string to number
                const numericId = parseInt(data.assigneeId, 10);
                if (!isNaN(numericId)) {
                  data.assigneeId = numericId;
                } else {
                  // If it can't be converted, use default
                  data.assigneeId = 1001;
                }
              }
            } else if (typeof data.assigneeId !== 'number') {
              // Handle any other non-numeric types
              data.assigneeId = 1001;
            }
            
            // For safety, ensure the final value is indeed a number
            if (data.assigneeId !== null && typeof data.assigneeId !== 'number') {
              data.assigneeId = 1001;
            }
            
            console.log('API Client - Final processed assigneeId:', data.assigneeId, typeof data.assigneeId);
            config.data = data;
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      this.handleSuccess,
      this.handleError
    );
  }

  // Handle successful responses
  private handleSuccess(response: AxiosResponse): AxiosResponse {
    return response;
  }

  // Handle error responses
  private handleError = (error: AxiosError<ApiResponse>): Promise<never> => {
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
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
      // Try to refresh the token
      this.post<{ token: string; refreshToken: string }>('/auth/refresh-token', { refreshToken })
        .then((response) => {
          // Store token under both names for backward compatibility
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
          window.location.reload(); // Reload the page with the new token
        })
        .catch(() => {
          // If refresh fails, log out
          this.logout();
        });
    } else {
      // No refresh token available, log out
      this.logout();
    }
  };

  // Log out user
  private logout = (): void => {
    // Clear all token variations for consistency
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
  };

  // Get request headers including auth token
  private getRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Check for tokens with both key names for backward compatibility
    const authToken = localStorage.getItem('authToken');
    const legacyToken = localStorage.getItem('token');
    const token = authToken || legacyToken;
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
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
    console.log(`[API Client] GET Request: ${url}`, { params, config }); // Log request details
    return this.client
      .get<ApiResponse<T> | T>(url, { ...config, params })
      .then((response) => {
        console.log(`[API Client] GET Response Raw Data for ${url}:`, response.data); // Log raw response data
        
        // Check if response is in expected format with data property
        if (response.data && typeof response.data === 'object') {
          // If it matches our ApiResponse format with status and data
          if ('status' in response.data && 'data' in response.data) {
            const apiResponse = response.data as ApiResponse<T>;
            
            if (apiResponse.status === 'success') {
              console.log(`[API Client] GET Success Data for ${url}:`, apiResponse.data);
              return apiResponse.data;
            } else {
              // Throw an error based on the API response message if available
              const errorMessage = apiResponse.message || 'Request failed';
              console.error(`[API Client] GET Error Status in Response for ${url}:`, errorMessage);
              throw new Error(errorMessage);
            }
          }
          // Success response with standardized structure
          else if ('success' in response.data && 'data' in response.data) {
            console.log(`[API Client] GET Success Data from success structure for ${url}:`, (response.data as any).data);
            return (response.data as any).data;
          }
          // Check if this is a notification preferences endpoint
          else if (url.includes('/notifications/preferences')) {
            // Special handling for notification preferences which may come in various formats
            console.log(`[API Client] Processing notification preferences data for ${url}`);
            return response.data as T;
          }
          // Fall back to assume direct data structure when not following ApiResponse
          else {
            console.log(`[API Client] GET Unexpected Response Format for ${url}. Returning raw data.`);
            return response.data as T;
          }
        } else {
          // For simple responses (strings, numbers, etc.)
          return response.data as T;
        }
      })
      .catch(error => {
        // Log the processed error from the interceptor or a new error
        console.error(`[API Client] GET Request Failed for ${url}:`, error);
        // Re-throw the error so downstream handlers catch it
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
      .post<ApiResponse<T>>(url, data, config)
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
  public async updateUserProfile(userId: string, profileData: any): Promise<User> {
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
    return this.put<any>(`/users/${userId}`, profileDTO)
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
  private normalizeUserResponse(response: any): UserDTO {
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
      id: response.id || response._id,
      email: response.email,
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