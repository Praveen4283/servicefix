import { createTheme, alpha, ThemeOptions } from '@mui/material/styles';

// Define brand colors for consistency
const brandColors = {
  primary: '#3f51b5',
  primaryDark: '#303f9f',
  primaryLight: '#7986cb',
  secondary: '#FF6B6B',
  secondaryDark: '#ff5252',
  secondaryLight: '#ff8a8a',
  dark: {
    background: '#0a1929',
    paper: '#132f4c',
    surface: '#1e3a5f',
  },
  light: {
    background: '#f8faff',
    paper: '#ffffff',
    surface: '#f0f4fa',
  }
};

// Common theme settings
const commonThemeSettings: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          borderRadius: 12,
          padding: '10px 20px',
          fontWeight: 600,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
          }
        }),
        contained: ({ theme }) => ({
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 16px rgba(0,0,0,0.3)'
            : '0 8px 16px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: theme.palette.mode === 'dark'
              ? '0 12px 20px rgba(0,0,0,0.4)'
              : '0 12px 20px rgba(0,0,0,0.15)',
          },
        }),
        containedPrimary: {
          background: `linear-gradient(45deg, ${brandColors.primary}, ${brandColors.secondary})`,
          '&:hover': {
            background: `linear-gradient(45deg, ${brandColors.primaryDark}, ${brandColors.secondaryDark})`,
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 16px rgba(0,0,0,0.4)'
            : '0 8px 16px rgba(0,0,0,0.05)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 12px 20px rgba(0,0,0,0.5)'
              : '0 12px 20px rgba(0,0,0,0.1)',
          }
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: alpha(brandColors.primary, 0.1),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
};

// Light theme
export const lightTheme = createTheme({
  ...commonThemeSettings,
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.primary,
      light: brandColors.primaryLight,
      dark: brandColors.primaryDark,
    },
    secondary: {
      main: brandColors.secondary,
      light: brandColors.secondaryLight,
      dark: brandColors.secondaryDark,
    },
    background: {
      default: brandColors.light.background,
      paper: brandColors.light.paper,
    },
    text: {
      primary: '#1a2027',
      secondary: '#616161',
    },
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...commonThemeSettings,
  palette: {
    mode: 'dark',
    primary: {
      main: brandColors.primaryLight,
      light: alpha(brandColors.primaryLight, 0.15),
      dark: brandColors.primary,
    },
    secondary: {
      main: brandColors.secondary,
      light: brandColors.secondaryLight,
      dark: brandColors.secondaryDark,
    },
    background: {
      default: brandColors.dark.background,
      paper: brandColors.dark.paper,
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
  },
  components: {
    ...commonThemeSettings.components,
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.dark.surface,
          borderColor: alpha('#fff', 0.05),
          borderWidth: 1,
          borderStyle: 'solid',
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    }
  }
});

// Define the themes object
const themes = {
  lightTheme,
  darkTheme
};

export default themes; 