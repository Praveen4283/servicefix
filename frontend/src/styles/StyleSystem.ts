import { Theme, SxProps } from '@mui/material';
import { alpha } from '@mui/material/styles';

// Define consistent spacing values
export const spacing = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
};

// Define consistent border radius values
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  circle: '50%',
};

// Define consistent shadow levels
export const shadows = {
  sm: (theme: Theme): string => 
    theme.palette.mode === 'dark' 
      ? '0 2px 8px rgba(0,0,0,0.3)' 
      : '0 2px 8px rgba(0,0,0,0.07)',
  md: (theme: Theme): string => 
    theme.palette.mode === 'dark' 
      ? '0 4px 16px rgba(0,0,0,0.4)' 
      : '0 4px 16px rgba(0,0,0,0.1)',
  lg: (theme: Theme): string => 
    theme.palette.mode === 'dark' 
      ? '0 8px 24px rgba(0,0,0,0.5)' 
      : '0 8px 24px rgba(0,0,0,0.15)',
  xl: (theme: Theme): string => 
    theme.palette.mode === 'dark' 
      ? '0 12px 32px rgba(0,0,0,0.6)' 
      : '0 12px 32px rgba(0,0,0,0.2)',
};

// Define consistent transition presets
export const transitions = {
  fast: 'all 0.15s ease-in-out',
  default: 'all 0.3s ease-in-out',
  slow: 'all 0.5s ease-in-out',
};

// Define gradient presets
export const gradients = {
  primary: (theme: Theme): string => 
    theme.palette.mode === 'dark'
      ? `linear-gradient(45deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.primary.main, 0.9)})`
      : `linear-gradient(45deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.light, 0.8)})`,
    
  secondary: (theme: Theme): string => 
    theme.palette.mode === 'dark'
      ? `linear-gradient(45deg, ${alpha(theme.palette.secondary.dark, 0.9)}, ${alpha(theme.palette.secondary.main, 0.9)})`
      : `linear-gradient(45deg, ${theme.palette.secondary.main}, ${alpha(theme.palette.secondary.light, 0.8)})`,
  
  success: (theme: Theme): string => 
    theme.palette.mode === 'dark'
      ? `linear-gradient(45deg, ${alpha(theme.palette.success.dark, 0.9)}, ${alpha(theme.palette.success.main, 0.9)})`
      : `linear-gradient(45deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.light, 0.8)})`,
  
  warning: (theme: Theme): string => 
    theme.palette.mode === 'dark'
      ? `linear-gradient(45deg, ${alpha(theme.palette.warning.dark, 0.9)}, ${alpha(theme.palette.warning.main, 0.9)})`
      : `linear-gradient(45deg, ${theme.palette.warning.main}, ${alpha(theme.palette.warning.light, 0.8)})`,
  
  error: (theme: Theme): string => 
    theme.palette.mode === 'dark'
      ? `linear-gradient(45deg, ${alpha(theme.palette.error.dark, 0.9)}, ${alpha(theme.palette.error.main, 0.9)})`
      : `linear-gradient(45deg, ${theme.palette.error.main}, ${alpha(theme.palette.error.light, 0.8)})`,
  
  paper: (theme: Theme): string => 
    theme.palette.mode === 'dark'
      ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette.background.default, 0.8)})`
      : `linear-gradient(135deg, ${alpha('#fff', 0.95)}, ${alpha(theme.palette.background.default, 0.9)})`,
      
  header: (theme: Theme): string => 
    theme.palette.mode === 'dark'
      ? `linear-gradient(120deg, ${alpha(theme.palette.primary.dark, 0.7)}, ${alpha(theme.palette.secondary.dark, 0.5)})`
      : `linear-gradient(120deg, ${alpha('#fff', 0.95)}, ${alpha(theme.palette.secondary.light, 0.15)})`,
};

// Helper function to create alpha colors
export const createAlpha = (color: string, opacity: number) => alpha(color, opacity);

// Common animation durations
export const animationDurations = {
  fast: 200,
  default: 300,
  slow: 500,
};

// Animation keyframes objects
export const keyframes = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  slideInUp: {
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideInRight: {
    from: { transform: 'translateX(20px)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  grow: {
    from: { transform: 'scale(0.8)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  pulse: {
    '0%': { opacity: 0.6 },
    '50%': { opacity: 0.3 },
    '100%': { opacity: 0.6 },
  },
};

// Layout background effects
export const backgroundEffects = {
  radialGradientTopRight: (theme: Theme) => ({
    '&::before': {
      content: '""',
      position: 'fixed',
      top: 0,
      right: 0,
      width: { xs: '100%', lg: '25%' },
      height: { xs: '40%', lg: '100%' },
      background: theme.palette.mode === 'dark' 
        ? `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 70%)`
        : `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.light, 0.15)} 0%, transparent 70%)`,
      zIndex: -1,
      opacity: 0.8,
      pointerEvents: 'none'
    }
  }),
  
  radialGradientBottomLeft: (theme: Theme) => ({
    '&::after': {
      content: '""',
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: { xs: '100%', lg: '25%' },
      height: { xs: '30%', lg: '60%' },
      background: theme.palette.mode === 'dark' 
        ? `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.dark, 0.15)} 0%, transparent 70%)`
        : `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.secondary.light, 0.15)} 0%, transparent 70%)`,
      zIndex: -1,
      opacity: 0.6,
      pointerEvents: 'none'
    }
  }),

  subtlePatternOverlay: (theme: Theme) => ({
    '&::before': {
      content: '""',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: theme.palette.mode === 'dark'
        ? 'url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h1v1H0V0zm5 0h1v1H5V0zm5 0h1v1h-1V0zm5 0h1v1h-1V0zm5 0h1v1h-1V0zm-20 5h1v1H0V5zm5 0h1v1H5V5zm5 0h1v1h-1V5zm5 0h1v1h-1V5zm5 0h1v1h-1V5zm-20 5h1v1H0v-1zm5 0h1v1H5v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm-20 5h1v1H0v-1zm5 0h1v1H5v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm-20 5h1v1H0v-1zm5 0h1v1H5v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm-20 5h1v1H0v-1zm5 0h1v1H5v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1z" opacity=".1" fill="%23FFFFFF" /%3E%3C/svg%3E")'
        : 'url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h1v1H0V0zm5 0h1v1H5V0zm5 0h1v1h-1V0zm5 0h1v1h-1V0zm5 0h1v1h-1V0zm-20 5h1v1H0V5zm5 0h1v1H5V5zm5 0h1v1h-1V5zm5 0h1v1h-1V5zm5 0h1v1h-1V5zm-20 5h1v1H0v-1zm5 0h1v1H5v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm-20 5h1v1H0v-1zm5 0h1v1H5v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm-20 5h1v1H0v-1zm5 0h1v1H5v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1zm5 0h1v1h-1v-1z" opacity=".05" fill="%23000000" /%3E%3C/svg%3E")',
      zIndex: -1,
      opacity: 0.5,
      pointerEvents: 'none'
    }
  })
};

// Consistent Page Layout
export const pageLayouts = {
  // Main page container with consistent spacing and background effects
  pageContainer: (theme: Theme) => ({
    py: { xs: spacing.sm, md: spacing.md },
    px: { xs: spacing.sm, sm: spacing.md, md: spacing.lg },
    width: '100%',
    maxWidth: '100%',
    minHeight: 'calc(100vh - 64px)', // Accounting for AppBar height
    overflowX: 'hidden',
    backgroundColor: 'background.default',
    transition: transitions.default,
    position: 'relative',
    ...backgroundEffects.radialGradientTopRight(theme),
    ...backgroundEffects.radialGradientBottomLeft(theme),
  }),
  
  // Section divider with consistent styling
  sectionDivider: (theme: Theme) => ({
    my: spacing.md,
    borderColor: alpha(theme.palette.divider, 0.6),
  }),
  
  // Page section with appropriate spacing
  pageSection: (theme: Theme) => ({
    mb: spacing.lg,
    width: '100%',
  }),
  
  // Page header with gradient background
  pageHeader: (theme: Theme) => ({
    p: 0,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: alpha(theme.palette.primary.main, 0.2),
    borderRadius: borderRadius.md,
    background: gradients.header(theme),
    position: 'relative',
    mb: spacing.md,
  }),
  
  // Page header content with consistent padding
  pageHeaderContent: (theme: Theme) => ({
    p: { xs: spacing.md, md: spacing.sm },
    position: 'relative',
    zIndex: 1,
  }),
};

// Enhanced Card Styles
export const cardStyles = {
  // Base card style with consistent appearance
  baseCard: (theme: Theme) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: shadows.md(theme),
    borderRadius: borderRadius.md,
    transition: transitions.default,
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid',
    borderColor: alpha(theme.palette.divider, 0.1),
  }),
  
  // Card with hover animation effect
  hoverCard: (theme: Theme) => ({
    ...cardStyles.baseCard(theme),
    '&:hover': {
      boxShadow: shadows.lg(theme),
      transform: 'translateY(-4px)',
    },
  }),
  
  // Card with gradient accent border at the top
  gradientCard: (theme: Theme) => ({
    ...cardStyles.hoverCard(theme),
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      borderTopLeftRadius: borderRadius.md,
      borderTopRightRadius: borderRadius.md,
      background: theme.palette.mode === 'dark'
        ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`
        : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      zIndex: 1,
      overflow: 'hidden'
    },
  }),
  
  // Card header with consistent styling
  cardHeader: (theme: Theme) => ({
    p: spacing.md,
    pb: spacing.sm,
    background: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.4)
      : alpha(theme.palette.background.paper, 0.7),
  }),
  
  // Card content with consistent padding
  cardContent: (theme: Theme) => ({
    p: spacing.md,
  }),
  
  // Stats card with icon
  statsCard: (theme: Theme) => ({
    ...cardStyles.baseCard(theme),
    boxShadow: shadows.sm(theme),
    '&:hover': {
      boxShadow: shadows.md(theme),
      transform: 'translateY(-2px)',
    },
  }),
};

// Button Styles
export const buttonStyles = {
  // Primary action button with animation
  primaryButton: (theme: Theme) => ({
    py: 1.2,
    px: 3,
    borderRadius: borderRadius.md,
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: '0 4px 14px 0 rgba(0,0,0,0.15)',
    transition: transitions.default,
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
      : theme.palette.primary.main,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px 0 rgba(0,0,0,0.2)',
      background: theme.palette.mode === 'dark'
        ? `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`
        : theme.palette.primary.dark,
    },
  }),
  
  // Secondary action button
  secondaryButton: (theme: Theme) => ({
    borderRadius: borderRadius.md,
    py: 1,
    px: 2.5,
    textTransform: 'none',
    fontWeight: 500,
    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : theme.palette.primary.main,
    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : theme.palette.primary.main,
    '&:hover': {
      borderColor: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.dark,
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : alpha(theme.palette.primary.main, 0.05),
    }
  }),
  
  // Icon button with consistent styling
  iconButton: (theme: Theme) => ({
    borderRadius: borderRadius.circle,
    transition: transitions.fast,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    },
  }),
};

// Common Animation Styles
export const animations = {
  fadeTransition: {
    enter: animationDurations.default,
    exit: animationDurations.fast,
  },
  
  zoomTransition: {
    enter: animationDurations.default,
    exit: animationDurations.fast,
  },
  
  growTransition: {
    enter: animationDurations.slow,
    exit: animationDurations.default,
  },
};

// Form styles
export const formStyles = {
  // Form container with consistent styling
  formContainer: (theme: Theme) => ({
    width: '100%',
    maxWidth: 550,
    mx: 'auto',
    p: { xs: spacing.md, sm: spacing.lg },
    borderRadius: borderRadius.md,
    boxShadow: shadows.md(theme),
    backgroundColor: 'background.paper',
  }),
  
  // Form section with spacing
  formSection: (theme: Theme) => ({
    mb: spacing.lg,
  }),
  
  // Form field group with consistent spacing
  formGroup: (theme: Theme) => ({
    mb: spacing.md,
  }),
  
  // Form actions container with consistent alignment
  formActions: (theme: Theme) => ({
    mt: spacing.lg,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  }),
  
  // Input field styling
  inputField: (theme: Theme) => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: borderRadius.sm,
      transition: transitions.fast,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
      },
      '&.Mui-focused': {
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
      }
    }
  }),
};

// Table styles
export const tableStyles = {
  // Table container with consistent styling
  tableContainer: (theme: Theme) => ({
    boxShadow: shadows.sm(theme),
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    '& .MuiTableHead-root': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? alpha(theme.palette.background.paper, 0.6)
        : alpha(theme.palette.background.paper, 0.8),
      '& .MuiTableCell-head': {
        fontWeight: 'bold',
      },
    },
    '& .MuiTableRow-root': {
      transition: transitions.fast,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
      }
    }
  }),
};

// Alert and notification styles
export const alertStyles = {
  // Success alert with consistent styling
  successAlert: (theme: Theme) => ({
    borderRadius: borderRadius.sm,
    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
    backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
  }),
  
  // Error alert with consistent styling
  errorAlert: (theme: Theme) => ({
    borderRadius: borderRadius.sm,
    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
    backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
  }),
  
  // Warning alert with consistent styling
  warningAlert: (theme: Theme) => ({
    borderRadius: borderRadius.sm,
    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
    backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
  }),
  
  // Info alert with consistent styling
  infoAlert: (theme: Theme) => ({
    borderRadius: borderRadius.sm,
    border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
    backgroundColor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
  }),
};

// Define all style system exports
const styleSystem = {
  spacing,
  borderRadius,
  shadows,
  transitions,
  gradients,
  createAlpha,
  animationDurations,
  keyframes,
  cardStyles,
  formStyles,
  buttonStyles,
  backgroundEffects,
  pageLayouts,
  alertStyles,
  animations,
  tableStyles,
};

// Export all styles
export default styleSystem; 