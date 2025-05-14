/**
 * Central date formatting utilities for consistent date handling across the application
 */
import { format, formatDistanceToNow, Locale, isValid, parseISO } from 'date-fns';

/**
 * Formats a date string to a standardized format
 * @param dateString - The date string to format
 * @param userTimeZone - Optional user timezone
 * @param formatStr - Optional format string (defaults to 'MMM d, yyyy h:mm a')
 * @returns Formatted date string or fallback text for invalid dates
 */
export const formatDate = (
  dateString: string | undefined | null,
  userTimeZone?: string,
  formatStr: string = 'MMM d, yyyy h:mm a'
): string => {
  if (!dateString) {
    return 'N/A';
  }

  try {
    // Create a Date object from the string
    const date = new Date(dateString);
    
    if (!isValid(date)) {
      console.warn(`Invalid date: ${dateString}`);
      return 'Invalid date';
    }

    // Use date-fns to format the date
    return format(date, formatStr);
  } catch (error) {
    console.error(`Error formatting date string "${dateString}":`, error);
    return 'Error formatting date';
  }
};

/**
 * Gets the relative time from a date string (e.g., "2 hours ago")
 * @param dateString - The date string to calculate relative time from
 * @param userTimeZone - Optional user timezone
 * @returns A human-readable relative time string
 */
export const getRelativeTime = (
  dateString: string | undefined | null,
  userTimeZone?: string
): string => {
  if (!dateString) {
    return 'N/A';
  }

  try {
    const date = parseISO(dateString);
    
    if (!isValid(date)) {
      return formatDate(dateString, userTimeZone);
    }

    // Use formatDistanceToNow for relative time
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error(`Error calculating relative time for "${dateString}":`, error);
    return formatDate(dateString, userTimeZone);
  }
};

/**
 * Formats a date using the user's locale preferences
 * @param date - The date to format
 * @param locale - Optional locale string
 * @returns Formatted date based on locale
 */
export const formatLocaleDate = (
  date: Date | number | string,
  locale?: string
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Date(dateObj).toLocaleDateString(locale || undefined);
  } catch (error) {
    console.error('Error formatting locale date:', error);
    return 'Invalid date';
  }
};

/**
 * Creates a standardized timestamp string
 * @param date - Date object or timestamp
 * @returns Formatted timestamp string
 */
export const formatTimestamp = (date: Date | number): string => {
  try {
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid timestamp';
  }
}; 