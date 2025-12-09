/**
 * Environment Variable Validation Utilities
 * Helper functions to safely retrieve and validate environment variables
 */

/**
 * Get an optional environment variable with a default value
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns The environment variable value or default
 */
export function getEnvOptional(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

/**
 * Get a required environment variable
 * @param key Environment variable key
 * @throws Error if the variable is not set
 * @returns The environment variable value
 */
export function getEnvRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}

/**
 * Get an environment variable as a number with optional default
 * @param key Environment variable key
 * @param defaultValue Default value if not found or not a valid number
 * @returns The parsed number value
 */
export function getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) {
        return defaultValue;
    }

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get an environment variable as a boolean with optional default
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns The parsed boolean value
 */
export function getEnvOptionalBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) {
        return defaultValue;
    }

    return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get an environment variable as a boolean (required)
 * @param key Environment variable key
 * @throws Error if the variable is not set
 * @returns The parsed boolean value
 */
export function getEnvBoolean(key: string): boolean {
    const value = getEnvRequired(key);
    return value.toLowerCase() === 'true' || value === '1';
}
