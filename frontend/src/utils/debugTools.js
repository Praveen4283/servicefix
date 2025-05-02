/**
 * Debug utilities for troubleshooting authentication issues
 */

// Check if localStorage is working properly
export const testLocalStorage = () => {
  try {
    // Try to set and get a test item
    localStorage.setItem('test-item', 'working');
    const retrieved = localStorage.getItem('test-item');
    localStorage.removeItem('test-item');
    
    if (retrieved === 'working') {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

// Check current authentication state
export const checkAuthState = () => {
  const authToken = localStorage.getItem('authToken');
  const userData = localStorage.getItem('user');
  
  if (authToken) {
    if (authToken.length) {
      return {
        hasToken: !!authToken,
        hasUserData: !!userData
      };
    }
  }
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return {
        hasToken: !!authToken,
        hasUserData: !!userData
      };
    } catch (error) {
      return {
        hasToken: !!authToken,
        hasUserData: !!userData
      };
    }
  }
  
  return {
    hasToken: !!authToken,
    hasUserData: !!userData
  };
};

// Clear all authentication data
export const clearAuthData = () => {
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    return true;
  } catch (error) {
    return false;
  }
};

// Add this to the window object in development
if (typeof window !== 'undefined') {
  window.debugAuth = {
    testLocalStorage,
    checkAuthState,
    clearAuthData
  };
} 