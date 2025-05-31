/**
 * Utility functions for handling ID conversions between string and number
 */

/**
 * Safely convert any ID to string
 * @param id The ID to convert
 * @returns The ID as a string, or undefined if id is undefined
 */
export const idToString = (id: string | number | undefined | null): string | undefined => {
  if (id === undefined || id === null) {
    return undefined;
  }
  return String(id);
};

/**
 * Safely convert any ID to number
 * @param id The ID to convert
 * @returns The ID as a number, or undefined if id is undefined or cannot be parsed
 */
export const idToNumber = (id: string | number | undefined | null): number | undefined => {
  if (id === undefined || id === null) {
    return undefined;
  }
  
  if (typeof id === 'number') {
    return id;
  }
  
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    return undefined;
  }
  
  return parsed;
};

/**
 * Safely convert any ID to number, with a default value if undefined or invalid
 * @param id The ID to convert
 * @param defaultValue The default value to use if id is undefined or invalid
 * @returns The ID as a number, or the default value
 */
export const idToNumberOrDefault = (
  id: string | number | undefined | null, 
  defaultValue: number
): number => {
  const parsed = idToNumber(id);
  return parsed !== undefined ? parsed : defaultValue;
}; 