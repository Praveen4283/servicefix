import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Skeleton,
  Avatar,
  useTheme,
  alpha,
  Paper,
  LinearProgress,
  Tooltip,
  Fade,
} from '@mui/material';

export interface StatData {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  progress?: number;
}

interface StatsWidgetProps {
  stats: StatData[];
  loading?: boolean;
  columns?: 1 | 2 | 3 | 4 | 6;
  animated?: boolean;
}

/**
 * A component for displaying multiple statistics in a grid layout with enhanced visuals
 */
const StatsWidget: React.FC<StatsWidgetProps> = ({
  stats,
  loading = false,
  columns = 4,
  animated = true,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Grid container spacing={3}>
        {Array.from(new Array(columns)).map((_, index) => (
          <Grid key={index} item xs={12} sm={6} md={12 / columns} lg={12 / columns}>
            <Skeleton 
              variant="rectangular" 
              height={140} 
              sx={{ 
                borderRadius: 2,
                animation: "pulse 1.5s ease-in-out 0.5s infinite" 
              }} 
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid 
          key={index} 
          item 
          xs={12} 
          sm={6} 
          md={12 / columns} 
          lg={12 / columns}
          sx={{
            opacity: 0,
            animation: animated ? `fadeInUp 0.5s ease forwards ${0.1 * index}s` : 'none',
            '@keyframes fadeInUp': {
              '0%': {
                opacity: 0,
                transform: 'translateY(20px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }}
        >
          <Card 
            elevation={0} 
            sx={{ 
              height: '100%',
              background: theme.palette.mode === 'dark' 
                ? `linear-gradient(145deg, ${alpha(stat.color, 0.2)}, ${alpha(stat.color, 0.08)})`
                : `linear-gradient(145deg, ${alpha(stat.color, 0.15)}, ${alpha(stat.color, 0.03)})`,
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark'
                ? alpha(stat.color, 0.3)
                : alpha(stat.color, 0.2),
              borderRadius: 3,
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? `0 15px 25px -12px ${alpha(stat.color, 0.4)}`
                  : `0 15px 25px -12px ${alpha(stat.color, 0.25)}`,
                '& .stat-icon': {
                  transform: 'scale(1.15) rotate(10deg)',
                  boxShadow: `0 8px 16px ${alpha(stat.color, 0.4)}`,
                }
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: theme.palette.mode === 'dark' 
                  ? `radial-gradient(circle at 20% 20%, ${alpha(stat.color, 0.2)} 0%, transparent 50%)`
                  : `radial-gradient(circle at 20% 20%, ${alpha(stat.color, 0.15)} 0%, transparent 50%)`,
                opacity: 0.8,
                zIndex: 0,
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '35%',
                height: '100%',
                background: `linear-gradient(to right, transparent, ${alpha(stat.color, 0.07)})`,
                pointerEvents: 'none',
              }
            }}
          >
            <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 2.5, md: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography 
                    variant="h6" 
                    component="div" 
                    sx={{ 
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: theme.palette.text.secondary,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {stat.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 0.7 }}>
                    <Typography 
                      variant="h4" 
                      component="div" 
                      sx={{ 
                        fontWeight: 700,
                        fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.25rem' },
                        background: theme.palette.mode === 'dark'
                          ? `linear-gradient(90deg, ${theme.palette.common.white}, ${alpha(stat.color, 0.9)})`
                          : `linear-gradient(90deg, ${theme.palette.text.primary}, ${stat.color})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        mr: 1,
                        lineHeight: 1.2
                      }}
                    >
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </Typography>
                    {stat.change && (
                      <Tooltip 
                        title={`${stat.change.isPositive ? 'Increased' : 'Decreased'} by ${stat.change.value}%`}
                        arrow
                        placement="top"
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600, 
                            color: stat.change.isPositive 
                              ? theme.palette.success.main 
                              : theme.palette.error.main,
                            display: 'flex',
                            alignItems: 'center',
                            background: stat.change.isPositive
                              ? alpha(theme.palette.success.main, 0.1)
                              : alpha(theme.palette.error.main, 0.1),
                            px: 1,
                            py: 0.5,
                            borderRadius: 5,
                            fontSize: '0.75rem'
                          }}
                        >
                          {stat.change.isPositive ? '+' : '-'}{stat.change.value}%
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                  {stat.subtitle && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block',
                        mt: 0.8,
                        fontSize: '0.75rem',
                        opacity: 0.85
                      }}
                    >
                      {stat.subtitle}
                    </Typography>
                  )}
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: alpha(stat.color, theme.palette.mode === 'dark' ? 0.3 : 0.2), 
                    color: stat.color,
                    width: { xs: 50, md: 60 }, 
                    height: { xs: 50, md: 60 },
                    boxShadow: `0 4px 12px ${alpha(stat.color, 0.3)}`,
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    border: '2px solid',
                    borderColor: alpha(stat.color, theme.palette.mode === 'dark' ? 0.4 : 0.3),
                  }}
                  className="stat-icon"
                >
                  {stat.icon}
                </Avatar>
              </Box>
              
              {stat.progress !== undefined && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Progress</Typography>
                    <Typography variant="caption" fontWeight="medium">{stat.progress}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={stat.progress} 
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(stat.color, 0.15),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: `linear-gradient(90deg, ${alpha(stat.color, 0.7)}, ${stat.color})`,
                        boxShadow: `0 0 10px ${alpha(stat.color, 0.5)}`,
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default StatsWidget; 