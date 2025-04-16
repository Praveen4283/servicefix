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
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use environment variable for the API URL to make it configurable for different environments
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    console.log('API Client initialized with base URL:', this.baseURL);
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
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

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      this.handleSuccess,
      this.handleError
    );
  }

  // Handle successful responses
  private handleSuccess(response: AxiosResponse): AxiosResponse {
    // Optionally log successful responses (commented out by default)
    // console.log(`API response for ${response.config.url}:`, response.status);
    return response;
  }

  // Handle error responses
  private handleError = (error: AxiosError<ApiResponse>): Promise<never> => {
    const { response, request, config } = error;
    // Optionally log the full error details (commented out by default)
    // console.error(`API error for ${config?.url || 'unknown endpoint'}:`, error);
    
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
          localStorage.setItem('authToken', response.token);
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
  };

  // GET request
  public get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.client
      .get<ApiResponse<T>>(url, { ...config, params })
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
        const userDTO: UserDTO = {
          id: response.id || response._id || userId,
          email: response.email,
          first_name: response.first_name || response.firstName || '',
          last_name: response.last_name || response.lastName || '',
          role: response.role || 'user',
          avatar_url: response.avatar_url || response.avatarUrl,
          phone_number: response.phone_number || response.phoneNumber,
          job_title: response.job_title || response.jobTitle,
          organization_id: response.organization_id || response.organizationId,
          organization: response.organization,
          created_at: response.created_at || response.createdAt,
          updated_at: response.updated_at || response.updatedAt
        };
        
        const user = mapUserDTOToUser(userDTO);
        return user;
      })
      .catch(error => {
        console.error('Error in getUser:', error);
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
    const profileDTO = mapProfileUpdateToDTO(profileData);
    
    const avatarFile = profileDTO.avatar;
    delete profileDTO.avatar; // Always remove the file object from the DTO
    
    // Get current user data to preserve existing avatar if needed
    const currentAuthUser = JSON.parse(localStorage.getItem('user') || '{}') as User;
    
    // Handle avatar separately if present
    if (avatarFile) {
      try {
        const compressedImage = await this.compressImage(avatarFile, {
          maxWidth: 300,
          maxHeight: 300,
          quality: 0.9 // Set quality to 90%
        });
        
        const dataUrl = await createDataURLFromFile(compressedImage);
        
        // Limit Data URL size (e.g., ~2MB)
        if (dataUrl.length > 2 * 1024 * 1024) {
          console.warn('Compressed avatar Data URL too large, skipping avatar update.');
          profileDTO.avatar_url = currentAuthUser.avatarUrl; // Keep existing avatar
        } else {
          console.log('Assigning compressed avatar Data URL to avatar_url');
          profileDTO.avatar_url = dataUrl; // Assign Data URL to avatar_url field
        }
        
      } catch (error) {
        console.error('Error processing avatar image, skipping avatar update:', error);
        profileDTO.avatar_url = currentAuthUser.avatarUrl; // Keep existing avatar on error
      }
    } else if (profileData.avatarUrl === undefined && currentAuthUser.avatarUrl !== undefined) {
      // Ensure we don't accidentally clear the avatar if no new file is provided and one exists
      profileDTO.avatar_url = currentAuthUser.avatarUrl;
    }
    
    return this.put<any>(`/users/${userId}`, profileDTO)
      .then(response => {
        const normalizedResponse = this.normalizeUserResponse(response);
        return mapUserDTOToUser(normalizedResponse);
      });
  }

  /**
   * Normalizes user response data to ensure it has the expected field structure
   * @param response The response data from the API
   * @returns A properly formatted UserDTO object
   */
  private normalizeUserResponse(response: any): UserDTO {
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
      job_title: response.job_title || response.jobTitle || response.designation || '',
      organization_id: response.organization_id || response.organizationId,
      organization: organizationData,
      timezone: response.timezone || 'UTC',
      language: response.language || 'en',
      last_login_at: response.last_login_at || response.lastLogin || response.lastLoginAt,
      // Include notification settings, ensuring it's an object
      notification_settings: typeof response.notification_settings === 'object' && response.notification_settings !== null 
                             ? response.notification_settings 
                             : undefined,
      created_at: response.created_at || response.createdAt,
      updated_at: response.updated_at || response.updatedAt
    };
    
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
        console.error('Error fetching organization:', error);
        return { id: 'unknown', name: 'Unknown Organization' };
      });
  }
}

// Create a single instance for the application
const apiClient = new ApiClient();

export default apiClient; 