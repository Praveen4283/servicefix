import { alpha, Theme, SxProps } from '@mui/material';
import * as stylesystem from './StyleSystem';

// Page container style used across all pages
export const pageContainer = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.pageLayouts.pageContainer(theme),
});

// Page header section with consistent styling
export const pageHeaderSection = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.pageLayouts.pageHeader(theme),
});

// Page header content styling
export const pageHeaderContent = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.pageLayouts.pageHeaderContent(theme),
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  justifyContent: 'space-between',
  alignItems: { xs: 'flex-start', sm: 'center' },
  width: '100%'
});

// Page section with consistent styling
export const pageSection = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.pageLayouts.pageSection(theme),
});

// Section divider with consistent styling 
export const sectionDivider = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.pageLayouts.sectionDivider(theme),
});

// Card style used throughout the application
export const cardStyleSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.cardStyles.gradientCard(theme),
});

// Card style without gradient header
export const baseCardStyleSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.cardStyles.hoverCard(theme),
});

// Card header styling
export const cardHeaderSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.cardStyles.cardHeader(theme),
});

// Card content styling
export const cardContentSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.cardStyles.cardContent(theme),
});

// Dashboard stats card style
export const statsCardSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.cardStyles.statsCard(theme),
});

// Form container styling
export const formContainerSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.formStyles.formContainer(theme),
});

// Form section with appropriate spacing
export const formSectionSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.formStyles.formSection(theme),
});

// Form group with consistent spacing
export const formGroupSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.formStyles.formGroup(theme),
});

// Form actions container
export const formActionsSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.formStyles.formActions(theme),
});

// Input field styling
export const inputFieldSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.formStyles.inputField(theme),
});

// Data table container
export const tableContainerSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.tableStyles.tableContainer(theme),
});

// Primary action button with gradient and animation
export const primaryButtonSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.buttonStyles.primaryButton(theme),
});

// Secondary action button
export const secondaryButtonSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.buttonStyles.secondaryButton(theme),
});

// Icon button with consistent styling
export const iconButtonSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.buttonStyles.iconButton(theme),
});

// Status badge styling with configurable color
export const statusBadgeSx = (color: string, theme: Theme): SxProps<Theme> => ({
  backgroundColor: alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.15),
  color: color,
  fontWeight: 600,
  border: `1px solid ${alpha(color, theme.palette.mode === 'dark' ? 0.3 : 0.2)}`,
  borderRadius: stylesystem.borderRadius.sm,
  px: 1.5,
  py: 0.5,
  fontSize: '0.75rem',
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 1,
});

// Alert styles for notifications
export const successAlertSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.alertStyles.successAlert(theme),
});

export const errorAlertSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.alertStyles.errorAlert(theme),
});

export const warningAlertSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.alertStyles.warningAlert(theme),
});

export const infoAlertSx = (theme: Theme): SxProps<Theme> => ({
  ...stylesystem.alertStyles.infoAlert(theme),
});

// Stats icon container
export const statsIconContainerSx = (color: string): SxProps<Theme> => ({
  backgroundColor: color,
  width: 56,
  height: 56,
  opacity: 0.9,
  borderRadius: stylesystem.borderRadius.circle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

// Common layout helpers
export const flexRowCenter: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
};

export const flexColumnCenter: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

export const flexBetween: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

// Loading states and skeletons
export const skeletonCardSx = (theme: Theme): SxProps<Theme> => ({
  borderRadius: stylesystem.borderRadius.md,
  overflow: 'hidden',
  height: '100%',
  '& .MuiSkeleton-rectangular': {
    borderRadius: stylesystem.borderRadius.sm,
  },
});

// Timeline styling
export const timelineItemSx = (theme: Theme): SxProps<Theme> => ({
  borderLeft: '1px dashed',
  borderColor: 'divider',
  pl: stylesystem.spacing.md,
  py: stylesystem.spacing.sm,
  mb: stylesystem.spacing.sm,
  position: 'relative',
  '&:hover': {
    borderColor: 'primary.main',
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -4,
    top: stylesystem.spacing.sm,
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: 'primary.main',
  },
});

// Button animation styles
export const buttonAnimation = {
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  }
};

// Fade transition for Material-UI Fade component
export const fadeTransition = {
  appear: 300,
  enter: 300,
  exit: 200,
};

// Fade transition for custom transitions (not for Material-UI Fade)
export const fadeTransitionStyle = {
  transition: stylesystem.transitions.default,
  opacity: 1,
};

// Table container style - as direct sx object, not function
export const tableContainerStyle = {
  borderRadius: stylesystem.borderRadius.md,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
};

// Function version for dynamic theming
export const tableContainerStyleFn = (theme: Theme): SxProps<Theme> => ({
  ...tableContainerSx(theme),
});

// Table row hover style - as direct sx object, not function
export const tableRowHoverStyle = {
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    cursor: 'pointer',
  }
};

// Function version for dynamic theming
export const tableRowHoverStyleFn = (theme: Theme): SxProps<Theme> => ({
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    cursor: 'pointer',
  }
});

// Stats icon style that accepts color as string
export const statsIconStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  width: 48,
  height: 48,
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  color: 'primary.main',
};

// Function version that accepts theme and optional color
export const getStatsIconStyle = (colorKey: string = 'primary.main', theme?: Theme): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  width: 48,
  height: 48,
  backgroundColor: theme ? alpha(theme.palette.primary.main, 0.1) : 'rgba(0, 0, 0, 0.1)',
  color: colorKey,
});

// Stats card style
export const statsCardStyleSx = statsCardSx;

// Card style alias
export const cardStyle = cardStyleSx;

// Welcome card style
export const welcomeCardStyleSx = (theme: Theme): SxProps<Theme> => ({
  ...cardStyleSx(theme),
  background: `linear-gradient(to right, ${alpha(theme.palette.primary.light, 0.2)}, ${alpha(theme.palette.primary.main, 0.1)})`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  padding: stylesystem.spacing.md,
});

// Chart container style
export const chartContainerStyle = (theme: Theme): SxProps<Theme> => ({
  ...cardStyleSx(theme),
  padding: stylesystem.spacing.md,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
});

// Filter section style
export const filterSectionStyleSx = (theme: Theme): SxProps<Theme> => ({
  padding: stylesystem.spacing.md,
  marginBottom: stylesystem.spacing.md,
  backgroundColor: theme.palette.background.paper,
  borderRadius: stylesystem.borderRadius.md,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
});

// Section card style
export const sectionCardStyleSx = (theme: Theme): SxProps<Theme> => ({
  ...baseCardStyleSx(theme),
  padding: stylesystem.spacing.md,
  marginBottom: stylesystem.spacing.md,
});