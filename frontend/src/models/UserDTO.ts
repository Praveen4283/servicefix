import { User } from '../context/AuthContext';
import { JsonObject, MetadataObject } from '../types/common';

/**
 * Data Transfer Object for User
 * Represents the structure of user data as it appears in the backend database
 */
export interface UserDTO {
  /** Primary key UUID */
  id: string;
  /** User's email address */
  email: string;
  /** User's first name (snake_case db convention) */
  first_name: string;
  /** User's last name (snake_case db convention) */
  last_name: string;
  /** User's role in the system */
  role: string;
  /** URL to user's avatar image */
  avatar_url?: string;
  /** User's phone number */
  phone_number?: string;
  /** User's designation/job title (snake_case db convention) */
  designation?: string;
  /** Reference to user's organization */
  organization_id?: string;
  /** Nested organization data */
  organization?: {
    id: string;
    name: string;
  };
  /** User's timezone */
  timezone?: string;
  /** User's preferred language */
  language?: string;
  /** Last login timestamp */
  last_login_at?: string;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
  /** User-specific notification settings */
  notification_settings?: Record<string, { email: boolean; push: boolean; in_app: boolean } | boolean>;
}

/**
 * ProfileUpdateDTO - Used when updating user profile data
 * Contains both frontend fields and potential file uploads
 */
export interface ProfileUpdateDTO {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  designation?: string;
  timezone?: string;
  language?: string;
  notification_settings?: Record<string, { email: boolean; push: boolean; in_app: boolean } | boolean>;
  avatar?: File | null;
  avatar_url?: string | null;
  email?: string;
}

/**
 * Maps database user format (UserDTO) to frontend User model
 * @param dto User data from the backend/database
 * @returns Formatted User object for the frontend
 */
export function mapUserDTOToUser(dto: UserDTO): User {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.first_name,
    lastName: dto.last_name,
    role: dto.role as 'admin' | 'agent' | 'customer',
    avatarUrl: dto.avatar_url,
    phoneNumber: dto.phone_number,
    designation: dto.designation,
    organizationId: dto.organization_id,
    organization: dto.organization ? {
      id: dto.organization.id,
      name: dto.organization.name
    } : undefined,
    timezone: dto.timezone,
    language: dto.language,
    // Keep all versions of login date for backwards compatibility
    lastLogin: dto.last_login_at,
    lastLoginAt: dto.last_login_at,
    last_login_at: dto.last_login_at,
    notificationSettings: dto.notification_settings,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at
  };
}

/**
 * Maps frontend User model to database format (UserDTO)
 * @param user User data from the frontend
 * @returns Formatted UserDTO object for the backend
 */
export function mapUserToDTO(user: Partial<User>): Partial<UserDTO> {
  const dto: Partial<UserDTO> = {};
  
  if (user.id !== undefined) dto.id = user.id;
  if (user.email !== undefined) dto.email = user.email;
  if (user.firstName !== undefined) dto.first_name = user.firstName;
  if (user.lastName !== undefined) dto.last_name = user.lastName;
  if (user.phoneNumber !== undefined) dto.phone_number = user.phoneNumber;
  if (user.designation !== undefined) dto.designation = user.designation;
  if (user.avatarUrl !== undefined) dto.avatar_url = user.avatarUrl;
  if (user.organizationId !== undefined) dto.organization_id = user.organizationId;
  if (user.timezone !== undefined) dto.timezone = user.timezone;
  if (user.language !== undefined) dto.language = user.language;
  if (user.notificationSettings !== undefined) dto.notification_settings = user.notificationSettings;
  
  return dto;
}

/**
 * ProfileUpdateData - Frontend data type for profile updates
 */
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  designation?: string;
  timezone?: string;
  language?: string;
  notificationSettings?: Record<string, { email: boolean; push: boolean; in_app: boolean } | boolean>;
  avatarFile?: File | null;
  avatarUrl?: string | null;
  email?: string;
}

/**
 * Maps frontend profile update data to DTO format for the API
 * Handles special case for avatar file
 * @param data Profile update data from frontend form
 * @returns Formatted data for backend API
 */
export function mapProfileUpdateToDTO(data: ProfileUpdateData): ProfileUpdateDTO {
  const dto: ProfileUpdateDTO = {};
  
  // Handle all possible profile fields with proper frontend->backend name mapping
  if (data.firstName !== undefined) dto.first_name = data.firstName;
  if (data.lastName !== undefined) dto.last_name = data.lastName;
  if (data.phoneNumber !== undefined) dto.phone_number = data.phoneNumber;
  if (data.designation !== undefined) dto.designation = data.designation;
  if (data.timezone !== undefined) dto.timezone = data.timezone;
  if (data.language !== undefined) dto.language = data.language;
  if (data.notificationSettings !== undefined) dto.notification_settings = data.notificationSettings;
  if (data.avatarFile !== undefined) dto.avatar = data.avatarFile;
  if (data.avatarUrl !== undefined) dto.avatar_url = data.avatarUrl;
  if (data.email !== undefined) dto.email = data.email;
  
  return dto;
}

/**
 * Creates a data URL from a file for local preview
 * @param file The file to create a data URL from
 * @returns Promise resolving to the data URL
 */
export function createDataURLFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
} 