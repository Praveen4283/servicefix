/**
 * Utility for API call retries with exponential backoff
 */

/**
 * Executes a function with retry capability for API calls
 * @param fn Function to execute that returns a Promise
 * @param maxRetries Maximum number of retry attempts
 * @param delay Initial delay in milliseconds
 * @returns Promise with the result of the function call
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry client errors (4xx) except for 429 (rate limit) and 408 (timeout)
      if (
        error.response && 
        error.response.status >= 400 && 
        error.response.status < 500 && 
        error.response.status !== 429 &&
        error.response.status !== 408
      ) {
        throw error;
      }
      
      console.warn(`API call attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`, error);
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff with jitter
      delay = delay * 2 * (0.9 + Math.random() * 0.2);
    }
  }
  
  console.error(`API call failed after ${maxRetries} attempts`, lastError);
  throw lastError;
};

/**
 * Creates a wrapped version of an API function with built-in retry
 * @param fn Function to wrap
 * @param maxRetries Maximum number of retry attempts
 * @param delay Initial delay in milliseconds
 * @returns Wrapped function with retry capability
 */
export const createRetryableFunction = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  maxRetries = 3,
  delay = 1000
): ((...args: T) => Promise<R>) => {
  return (...args: T) => withRetry(() => fn(...args), maxRetries, delay);
}; 