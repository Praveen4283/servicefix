import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  Skeleton,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  alpha,
  Divider,
  Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

// Define allowed animation timing values using a type that matches Recharts' AnimationTiming
type AnimationTiming = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'stacked-bar';

// Simplified interface for the data items
interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: any;
}

interface TicketChartProps {
  data: ChartDataItem[];
  type?: ChartType;
  colors?: string[];
  height?: number;
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  isLoading?: boolean;
  onMoreClick?: () => void;
}

/**
 * A enhanced chart component for displaying ticket data with better visual elements
 */
const TicketChart: React.FC<TicketChartProps> = ({
  data,
  type = 'bar',
  colors,
  height = 300,
  title,
  description,
  xAxisLabel,
  yAxisLabel,
  isLoading = false,
  onMoreClick,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Default chart colors with theme integration
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    isDarkMode ? '#26c6da' : '#00bcd4', // cyan
    isDarkMode ? '#ffa726' : '#ff9800', // orange
    isDarkMode ? '#66bb6a' : '#4caf50', // green
    isDarkMode ? '#ec407a' : '#e91e63', // pink
  ];
  
  const chartColors = colors || defaultColors;
  
  // Helper function to create consistent chart styling
  const getChartColors = () => {
    return {
      text: theme.palette.text.secondary,
      grid: theme.palette.divider,
      tooltip: {
        bg: isDarkMode ? alpha(theme.palette.background.paper, 0.9) : alpha(theme.palette.background.paper, 0.95),
        border: isDarkMode ? alpha(theme.palette.primary.main, 0.25) : alpha(theme.palette.primary.main, 0.1),
      }
    };
  };
  
  const chartStyleColors = getChartColors();
  
  // Custom tooltip component for recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            background: chartStyleColors.tooltip.bg,
            border: `1px solid ${chartStyleColors.tooltip.border}`,
            p: 2,
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxWidth: 250,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: type === 'pie' 
                ? `linear-gradient(90deg, ${chartColors[0]}, ${chartColors[1] || chartColors[0]})`
                : chartColors[0],
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
            }
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: theme.palette.text.primary, 
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              pb: 1,
              mb: 1,
              fontWeight: 600
            }}
          >
            {label || 'Data'}
          </Typography>
          {payload.map((entry: any, index: number) => {
            // Make sure entry and entry.color exist to avoid the TypeError
            if (!entry) return null;
            const entryColor = entry.color || chartColors[index % chartColors.length];
            const entryName = entry.name || `Series ${index + 1}`;
            const entryValue = entry.value !== undefined ? entry.value : 'N/A';
            
            return (
              <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: entryColor,
                    mr: 1.5,
                    boxShadow: `0 0 6px ${alpha(entryColor, 0.6)}`
                  }}
                />
                <Typography variant="body2" sx={{ mr: 1, color: alpha(theme.palette.text.primary, 0.8), fontWeight: 500 }}>
                  {entryName}:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {entryValue}
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    }
    return null;
  };

  const renderChart = () => {
    // Common chart styling
    const commonProps = {
      margin: { top: 15, right: 30, left: 20, bottom: 30 },
    };

    // Animation settings with proper typing
    const animationProps = {
      animationBegin: 0,
      animationDuration: 1500,
      animationEasing: 'ease-out' as AnimationTiming
    };

    switch (type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart {...commonProps}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={height / 3}
                innerRadius={height / 6} // Make it a donut chart
                fill={chartColors[0]}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                {...animationProps}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartColors[index % chartColors.length]}
                    stroke={isDarkMode ? alpha('#000', 0.1) : alpha('#fff', 0.5)}
                    strokeWidth={3}
                    style={{ filter: `drop-shadow(0px 3px 6px ${alpha(chartColors[index % chartColors.length], 0.3)})` }}
                  />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                layout="horizontal" 
                wrapperStyle={{ 
                  paddingTop: 20,
                  fontSize: '0.85rem',
                  color: chartStyleColors.text,
                  fontWeight: 500
                }} 
                iconType="circle"
                iconSize={10}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} {...commonProps}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={chartStyleColors.grid} 
                vertical={false} 
                opacity={0.6}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: chartStyleColors.text }} 
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: chartStyleColors.text } : undefined}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: chartStyleColors.text }}
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: chartStyleColors.text } : undefined}
                dx={-10}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColors[0]}
                strokeWidth={3}
                dot={{ fill: chartColors[0], strokeWidth: 2, r: 4, stroke: isDarkMode ? theme.palette.background.default : '#fff' }}
                activeDot={{ r: 6, strokeWidth: 2, fill: chartColors[0], stroke: '#fff' }}
                {...animationProps}
                style={{ filter: `drop-shadow(0px 2px 4px ${alpha(chartColors[0], 0.4)})` }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} {...commonProps}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={chartStyleColors.grid} 
                vertical={false} 
                opacity={0.6}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: chartStyleColors.text }}
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: chartStyleColors.text } : undefined}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: chartStyleColors.text }}
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: chartStyleColors.text } : undefined}
                dx={-10}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColors[0]}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
                {...animationProps}
                style={{ filter: `drop-shadow(0px 3px 6px ${alpha(chartColors[0], 0.3)})` }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'stacked-bar':
        // For stacked-bar we assume the data has multiple properties besides 'name'
        // Find all keys except 'name' to create the stacked bars
        const barKeys = Object.keys(data[0] || {}).filter((key) => key !== 'name');

        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} {...commonProps}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={chartStyleColors.grid} 
                vertical={false} 
                opacity={0.6}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: chartStyleColors.text }} 
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: chartStyleColors.text } : undefined}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: chartStyleColors.text }}
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: chartStyleColors.text } : undefined}
                dx={-10}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                wrapperStyle={{ 
                  paddingTop: 10, 
                  paddingBottom: 10,
                  fontSize: '0.85rem',
                  color: chartStyleColors.text,
                  fontWeight: 500
                }} 
                iconType="circle"
                iconSize={8}
              />
              {barKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={chartColors[index % chartColors.length]}
                  radius={[index === barKeys.length - 1 ? 4 : 0, index === barKeys.length - 1 ? 4 : 0, 0, 0]}
                  {...animationProps}
                  style={{ filter: `drop-shadow(0px 3px 6px ${alpha(chartColors[index % chartColors.length], 0.3)})` }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      // Default case: bar chart
      default:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} {...commonProps}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={chartStyleColors.grid} 
                vertical={false} 
                opacity={0.6}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: chartStyleColors.text }}
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: chartStyleColors.text } : undefined}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: chartStyleColors.text }}
                tickLine={{ stroke: chartStyleColors.grid }}
                axisLine={{ stroke: chartStyleColors.grid }}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: chartStyleColors.text } : undefined}
                dx={-10}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill={chartColors[0]}
                radius={[6, 6, 0, 0]}
                barSize={35}
                {...animationProps}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartColors[index % chartColors.length]} 
                    style={{ filter: `drop-shadow(0px 3px 6px ${alpha(chartColors[index % chartColors.length], 0.3)})` }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card 
      elevation={0} 
      sx={{ 
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: theme.palette.divider,
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s',
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 10px 30px -12px rgba(0, 0, 0, 0.4)' 
            : '0 10px 30px -12px rgba(0, 0, 0, 0.2)',
          transform: 'translateY(-8px)',
        },
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: type === 'pie' 
            ? `conic-gradient(${chartColors.join(', ')})`
            : `linear-gradient(90deg, ${chartColors[0]}, ${chartColors[1] || chartColors[0]})`
        }
      }}
    >
      {title && (
        <>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography 
                  variant="h6" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    letterSpacing: '0.3px',
                    color: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.common.white, 0.95) 
                      : theme.palette.text.primary
                  }}
                >
                  {title}
                </Typography>
                {description && (
                  <Tooltip title={description} arrow placement="top">
                    <IconButton size="small" sx={{ ml: 0.5, mt: -0.5 }}>
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            }
            action={
              onMoreClick && (
                <IconButton 
                  onClick={onMoreClick} 
                  aria-label="more options" 
                  sx={{
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'rotate(90deg)',
                      color: theme.palette.primary.main
                    }
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              )
            }
            sx={{ px: 3, pt: 2.5, pb: 1 }}
          />
          <Divider />
        </>
      )}
      <CardContent sx={{ 
        p: { xs: 2.5, sm: 3 }, 
        pt: title ? 2.5 : 3, 
        height: title ? `calc(100% - 76px)` : '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {isLoading ? (
          <Box 
            sx={{ 
              height: height, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center' 
            }}
          >
            <Skeleton 
              variant="rectangular" 
              height={height - 20} 
              sx={{ 
                borderRadius: 2,
                animation: "pulse 1.5s ease-in-out 0.5s infinite",
                '@keyframes pulse': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 0.9 },
                  '100%': { opacity: 0.6 },
                }
              }} 
            />
          </Box>
        ) : data.length === 0 ? (
          <Box 
            sx={{ 
              height: height, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
          >
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{
                fontWeight: 500,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                px: 3,
                py: 1.5,
                borderRadius: 2
              }}
            >
              No data available
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            height: height, 
            opacity: 0, 
            animation: 'fadeIn 0.8s ease-out forwards 0.2s',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(10px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}>
            {renderChart()}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketChart; 