import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../theme';
import useMediaQuery from '@mui/material/useMediaQuery';

// Define theme context types
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  theme: typeof lightTheme | typeof darkTheme;
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Check system preference
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Get stored theme preference or use system
  const getInitialThemeMode = (): ThemeMode => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
      return savedMode as ThemeMode;
    }
    return 'system';
  };

  // State for theme mode
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode());
  
  // Derive dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    mode === 'system' ? prefersDarkMode : mode === 'dark'
  );

  // Update isDarkMode when preferences change
  useEffect(() => {
    setIsDarkMode(mode === 'system' ? prefersDarkMode : mode === 'dark');
  }, [mode, prefersDarkMode]);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Toggle between light and dark mode
  const toggleTheme = () => {
    if (isDarkMode) {
      setMode('light');
    } else {
      setMode('dark');
    }
  };

  // Set specific theme mode
  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  // Get current theme object
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Context value
  const value = {
    mode,
    isDarkMode,
    toggleTheme,
    setThemeMode,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 