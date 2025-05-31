/**
 * Utility functions to convert between snake_case (database convention) and camelCase (TypeScript convention)
 */

/**
 * Convert database snake_case to TypeScript camelCase
 * This centralizes the naming convention conversion logic
 * 
 * @param obj The object with snake_case keys from database
 * @returns A new object with camelCase keys for TypeScript
 */
export function snakeToCamel<T>(obj: Record<string, any>): T {
  if (!obj || typeof obj !== 'object' || obj === null) {
    return obj as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item)) as unknown as T;
  }

  const camelObj: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Convert key to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Recursively convert nested objects and arrays
      if (obj[key] !== null && typeof obj[key] === 'object') {
        camelObj[camelKey] = snakeToCamel(obj[key]);
      } else {
        camelObj[camelKey] = obj[key];
      }
    }
  }
  
  return camelObj as T;
}

/**
 * Convert TypeScript camelCase to database snake_case
 * This centralizes the naming convention conversion logic
 * 
 * @param obj The object with camelCase keys from TypeScript
 * @returns A new object with snake_case keys for database
 */
export function camelToSnake<T>(obj: Record<string, any>): T {
  if (!obj || typeof obj !== 'object' || obj === null) {
    return obj as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnake(item)) as unknown as T;
  }

  const snakeObj: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Convert key to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      // Recursively convert nested objects and arrays
      if (obj[key] !== null && typeof obj[key] === 'object') {
        snakeObj[snakeKey] = camelToSnake(obj[key]);
      } else {
        snakeObj[snakeKey] = obj[key];
      }
    }
  }
  
  return snakeObj as T;
}

/**
 * Type-safe property mapping helper for entity-to-dto conversions
 * Maps a property with optional transformation
 * 
 * @param source Source object
 * @param sourceKey Key in source object
 * @param target Target object
 * @param targetKey Key in target object
 * @param transform Optional transformation function
 */
export function mapProperty<S, T, V>(
  source: S,
  sourceKey: keyof S,
  target: T,
  targetKey: keyof T,
  transform?: (value: any) => any
): void {
  if (source[sourceKey] !== undefined) {
    const value = source[sourceKey];
    (target as any)[targetKey] = transform ? transform(value) : value;
  }
} 