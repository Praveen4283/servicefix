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
      console.log('✅ localStorage is working correctly');
      return true;
    } else {
      console.error('❌ localStorage is not returning correct values');
      return false;
    }
  } catch (error) {
    console.error('❌ localStorage error:', error);
    return false;
  }
};

// Check current authentication state
export const checkAuthState = () => {
  const authToken = localStorage.getItem('authToken');
  const userData = localStorage.getItem('user');
  
  console.log('Auth token exists:', !!authToken);
  if (authToken) {
    console.log('Auth token length:', authToken.length);
  }
  
  console.log('User data exists:', !!userData);
  if (userData) {
    try {
      const user = JSON.parse(userData);
      console.log('User data:', {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
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
    console.log('✅ Authentication data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing authentication data:', error);
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
  console.log('Debug tools available at window.debugAuth');
} 