import { ConsentCategory } from '../context/CookieConsentContext';

/**
 * Interface for cookie options
 */
interface CookieOptions {
  expires?: Date | number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  category: ConsentCategory;
}

/**
 * Sets a cookie with the specified name, value, and options
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export const setCookie = (name: string, value: string, options: CookieOptions): void => {
  // Build the cookie string
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  // Add expiration date
  if (options.expires) {
    const date = options.expires instanceof Date 
      ? options.expires 
      : new Date(Date.now() + options.expires);
    cookieString += `; expires=${date.toUTCString()}`;
  }

  // Add other options
  if (options.path) cookieString += `; path=${options.path}`;
  if (options.domain) cookieString += `; domain=${options.domain}`;
  if (options.secure) cookieString += '; secure';
  if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;

  // Set the cookie
  document.cookie = cookieString;
};

/**
 * Gets a cookie by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    const [cookieName, cookieValue] = cookie.split('=');
    
    if (cookieName === encodeURIComponent(name)) {
      return decodeURIComponent(cookieValue);
    }
  }
  
  return null;
};

/**
 * Deletes a cookie by name
 * @param name - Cookie name
 * @param path - Cookie path (should match the path used when setting)
 * @param domain - Cookie domain (should match the domain used when setting)
 */
export const deleteCookie = (name: string, path?: string, domain?: string): void => {
  // Set expiration to the past to delete
  const options: CookieOptions = {
    expires: new Date(0),
    category: 'necessary',
  };
  
  if (path) options.path = path;
  if (domain) options.domain = domain;
  
  setCookie(name, '', options);
};

/**
 * Sets a cookie only if consent has been given for its category
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (including category)
 * @param hasConsented - Function to check if consent has been given for the category
 * @returns Whether the cookie was set (based on consent)
 */
export const setConsentAwareCookie = (
  name: string, 
  value: string, 
  options: CookieOptions,
  hasConsented: (category: ConsentCategory) => boolean
): boolean => {
  // Check if consent has been given for this category
  if (hasConsented(options.category)) {
    setCookie(name, value, options);
    return true;
  }
  
  return false;
};

/**
 * Parse cookie string to object
 * @param cookieString - Cookie string in format "name=value; name2=value2"
 * @returns Object with cookie name-value pairs
 */
export const parseCookieString = (cookieString: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  
  if (!cookieString) return cookies;
  
  const cookiePairs = cookieString.split(';');
  
  for (const pair of cookiePairs) {
    const [name, value] = pair.trim().split('=');
    if (name && value) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value);
    }
  }
  
  return cookies;
};

/**
 * Get all cookies as an object
 * @returns Object with all cookies as name-value pairs
 */
export const getAllCookies = (): Record<string, string> => {
  return parseCookieString(document.cookie);
}; 