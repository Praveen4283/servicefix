import { Theme } from '@mui/material';

/**
 * Returns gradient text styles based on the current theme
 */
export const getGradientTextStyles = (theme: Theme) => ({
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(90deg, #90caf9, #f48fb1)' 
    : 'linear-gradient(90deg, #3f51b5, #f50057)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
});

/**
 * Returns title gradient text styles based on the current theme
 */
export const getTitleGradientStyles = (theme: Theme) => ({
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(90deg, #fff, rgba(255,255,255,0.8))' 
    : 'linear-gradient(90deg, #1a237e, #3949ab)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
});

/**
 * Returns section header styles with fade-in animation
 */
export const getSectionHeaderStyles = (theme: Theme, isVisible: boolean) => ({
  mb: 2, 
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 1,
  display: 'inline-block',
  ...getGradientTextStyles(theme),
  animation: isVisible ? 'fadeInUp 0.6s ease-out' : 'none',
  '@keyframes fadeInUp': {
    '0%': { opacity: 0, transform: 'translateY(20px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  }
});

/**
 * Returns section title styles with fade-in animation
 */
export const getSectionTitleStyles = (theme: Theme, isVisible: boolean) => ({
  mb: 3, 
  fontWeight: 800,
  ...getTitleGradientStyles(theme),
  animation: isVisible ? 'fadeInUp 0.8s ease-out' : 'none',
});

/**
 * Returns section subtitle styles with fade-in animation
 */
export const getSectionSubtitleStyles = (isVisible: boolean) => ({
  fontWeight: 400,
  animation: isVisible ? 'fadeInUp 1s ease-out' : 'none',
  maxWidth: '800px', 
  mx: 'auto',
  lineHeight: 1.6,
  mb: 4,
});

/**
 * Returns card hover effects common across sections
 */
export const getCardHoverEffects = (theme: Theme) => ({
  transform: 'translateY(-12px)',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 20px 40px rgba(0,0,0,0.4)'
    : '0 20px 40px rgba(0,0,0,0.1)'
});

/**
 * Returns common card style properties
 */
export const getCommonCardStyles = (theme: Theme) => ({
  height: '100%',
  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  borderRadius: '20px',
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 10px 30px rgba(0,0,0,0.2)'
    : '0 10px 30px rgba(0,0,0,0.05)',
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' 
    ? 'rgba(255,255,255,0.05)' 
    : 'rgba(0,0,0,0.03)',
}); 