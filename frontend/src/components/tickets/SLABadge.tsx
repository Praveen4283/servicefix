import React, { useState, useEffect, useCallback } from 'react';
import {
  Chip,
  Tooltip,
  Box,
  CircularProgress,
  Typography,
  useTheme,
  Skeleton,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Pause as PauseIcon,
  PauseCircleOutline as PauseCircleIcon
} from '@mui/icons-material';
import slaService, { SLAStatus } from '../../services/slaService';

// SLA Cache to prevent redundant API calls
const slaCache = new Map<string, { status: SLAStatus | null; error: string | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Error retry backoff durations - shorter to avoid excessive retries
const RETRY_DELAYS = [2000, 5000]; // Reduced retry attempts

interface SLABadgeProps {
  ticketId: number | string;
  refreshTrigger?: number; // Optional prop to trigger refresh
  showDetails?: boolean; // Whether to show detailed information
  ticketPriorityId?: number | string; // Add priority ID to help with SLA policy retrieval
}

// Function to render estimated SLA based on priority when actual SLA data is not available
const renderEstimatedSLA = (slaStatus: SLAStatus | null, theme: any) => {
  if (!slaStatus) return null;
  
  return (
    <Tooltip title="Estimated SLA based on ticket priority">
      <Chip 
        label="SLA Estimated" 
        size="small" 
        color="info"
        sx={{ bgcolor: '#E3F2FD' }}
      />
    </Tooltip>
  );
};

const SLABadge: React.FC<SLABadgeProps> = ({ 
  ticketId, 
  refreshTrigger = 0, 
  showDetails = false,
  ticketPriorityId 
}) => {
  // Clean and standardize the ticket ID - critical for caching and API calls
  const cleanedTicketId = React.useMemo(() => {
    if (!ticketId) return null;
    
    if (typeof ticketId === 'number') return String(ticketId);
    
    // Handle string ticket IDs like "TIK-1001" by extracting digits
    const matches = String(ticketId).match(/\d+/);
    return matches ? matches[0] : null;
  }, [ticketId]);
  
  const [slaStatus, setSlaStatus] = useState<SLAStatus | null>(null);
  const [loading, setLoading] = useState(!!cleanedTicketId); // Only show loading if there's a valid ID
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const theme = useTheme();
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Flag to indicate if we have a valid clean ID
  const hasValidId = Boolean(cleanedTicketId);

  // Clear any existing timers when unmounting
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  // Attempt to assign SLA policy if none found
  const attemptSLAAssignment = useCallback(async () => {
    if (!cleanedTicketId) return false;
    
    try {
      console.log(`Attempting to auto-assign SLA policy for ticket ${cleanedTicketId}`);
      const response = await slaService.autoAssignSLAPolicy(cleanedTicketId);
      return !!response;
    } catch (err) {
      console.error('Error auto-assigning SLA policy:', err);
      return false;
    }
  }, [cleanedTicketId]);

  // Check if there's a cached response first
  const loadSLAStatus = useCallback(async (force = false) => {
    // Skip if ID is invalid or we've reached max retries
    if (!hasValidId || !cleanedTicketId || (retryCount >= RETRY_DELAYS.length && !force)) {
      setLoading(false);
      if (!hasValidId) setError("No SLA policy found");
      return;
    }

    // Check cache first if not forcing refresh
    if (!force) {
      const cachedData = slaCache.get(cleanedTicketId);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        setSlaStatus(cachedData.status);
        setError(cachedData.error);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      const status = await slaService.getTicketSLAStatus(cleanedTicketId);
      setSlaStatus(status);
      setError(null);
      
      // Cache successful response
      slaCache.set(cleanedTicketId, { 
        status, 
        error: null, 
        timestamp: Date.now() 
      });
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (err: any) {
      console.error('Error loading SLA status:', err);
      
      // If the error is "No SLA policy found", try to auto-assign one
      if (err.message === 'No SLA policy found') {
        const assigned = await attemptSLAAssignment();
        
        if (assigned) {
          // If we successfully assigned a policy, try loading again
          console.log('Successfully assigned SLA policy, reloading status');
          await loadSLAStatus(true);
          return;
        }
      }
      
      // Unified error message for a better user experience
      const errorMessage = 'No SLA policy found';
      
      setError(errorMessage);
      setSlaStatus(null);
      
      // Cache the error state too to prevent constant retries
      slaCache.set(cleanedTicketId, { 
        status: null, 
        error: errorMessage, 
        timestamp: Date.now() 
      });
      
      // Set up retry with limited backoff
      if (retryCount < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount];
        if (timerRef.current) clearTimeout(timerRef.current);
        
        timerRef.current = setTimeout(() => {
          loadSLAStatus(true); // Force refresh on retry
        }, delay);
        
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [cleanedTicketId, retryCount, hasValidId, attemptSLAAssignment]);

  useEffect(() => {
    if (hasValidId) {
      // Initial load
      loadSLAStatus();
      
      // Set up timer for regular refreshes - but only if no errors
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      
      // Only set up refresh interval if we're not in an error state
      if (error === null || error === undefined) {
      refreshTimerRef.current = setInterval(() => {
          loadSLAStatus(true);
        }, 120000); // Refresh every 2 minutes instead of 1 minute to reduce load
        }
    } else {
      // Set loading to false if ID is invalid to show the fallback immediately
      setLoading(false);
    }
    
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [cleanedTicketId, refreshTrigger, loadSLAStatus, error, hasValidId]);

  // Force refresh when refreshTrigger changes
  useEffect(() => {
    if (hasValidId && refreshTrigger > 0) {
      loadSLAStatus(true);
    }
  }, [refreshTrigger, loadSLAStatus, hasValidId]);

  // Determine if SLA is currently paused by checking metadata
  const isSLAPaused = React.useMemo(() => {
    if (!slaStatus?.slaInfo?.metadata) return false;
    
    try {
      let metadata;
      
      // Check if metadata is already an object or needs to be parsed from string
      if (typeof slaStatus.slaInfo.metadata === 'string') {
        metadata = JSON.parse(slaStatus.slaInfo.metadata);
      } else {
        metadata = slaStatus.slaInfo.metadata;
      }
      
      if (Array.isArray(metadata.pausePeriods) && metadata.pausePeriods.length > 0) {
        // Check if the last pause period doesn't have an end date
        const lastPausePeriod = metadata.pausePeriods[metadata.pausePeriods.length - 1];
        return lastPausePeriod && !lastPausePeriod.endedAt;
      }
    } catch (err) {
      console.error('Error parsing SLA metadata:', err);
    }
    
    return false;
  }, [slaStatus]);

  // Utility function to format remaining time
  const formatTimeLeft = (minutes: number, isBreached: boolean = false): string => {
    // For breached SLAs, use absolute value to show time over SLA
    const absMinutes = Math.abs(minutes);
    
    if (absMinutes < 60) {
      return isBreached ? 
        `${absMinutes} min over SLA` : 
        `${absMinutes} min`;
    } else if (absMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(absMinutes / 60);
      const remainingMinutes = absMinutes % 60;
      return isBreached ?
        (remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m over SLA` : `${hours}h over SLA`) :
        (remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`);
    } else { // Days
      const days = Math.floor(absMinutes / 1440);
      const hours = Math.floor((absMinutes % 1440) / 60);
      return isBreached ?
        (hours > 0 ? `${days}d ${hours}h over SLA` : `${days}d over SLA`) :
        (hours > 0 ? `${days}d ${hours}h` : `${days}d`);
    }
  };

  // Utility function to capitalize first letter of a string
  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Check for error states first
  
  // If we don't have a valid ID or there's an error, return a consistent "No SLA" chip
  if (!hasValidId || error || !slaStatus || !slaStatus.slaInfo) {
    return (
      <Tooltip title="No SLA policy found for this ticket">
        <Chip
          icon={<InfoIcon />}
          label="No SLA"
          size="small"
          color="default"
          sx={{ 
            backgroundColor: theme.palette.grey[200],
            '& .MuiChip-icon': { color: theme.palette.grey[600] }
          }}
        />
      </Tooltip>
    );
  }

  if (loading) {
    return showDetails ? 
      <Skeleton variant="rounded" width="100%" height={36} /> : 
      <CircularProgress size={20} />;
  }

  // If SLA is estimated, show the estimated badge
  if (slaStatus && slaStatus.isEstimated) {
    return renderEstimatedSLA(slaStatus, theme);
  }

  // Determine which SLA to display (resolution is the primary one)
  const isBreached = slaStatus!.isResolutionBreached;
  const remainingMinutes = slaStatus!.resolutionRemainingMinutes;
  const percentage = slaStatus!.resolutionPercentage;
  
  // Get the appropriate status color based on percentage
  let statusColor: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
  let StatusIcon = AccessTimeIcon;
  
  if (isSLAPaused) {
    StatusIcon = PauseIcon;
    statusColor = "default";
  } else if (isBreached) {
    StatusIcon = ErrorIcon;
    statusColor = "error";
  } else if (slaStatus!.isFirstResponseBreached) {
    // If first response is breached, show warning status
    StatusIcon = WarningIcon;
    statusColor = "error";
  } else if (percentage >= 80) {
    StatusIcon = WarningIcon;
    statusColor = "error";
  } else if (percentage >= 50) {
    StatusIcon = WarningIcon;
    statusColor = "warning";
  } else {
    StatusIcon = CheckCircleIcon;
    statusColor = "success";
  }

  // Format the remaining time
  const formattedTime = isSLAPaused 
    ? 'Paused' 
    : isBreached 
      ? 'Breached over SLA'
      : slaService.formatRemainingTime(remainingMinutes);

  // For compact view (list page), show a simple colored chip
  if (!showDetails) {
    return (
      <Tooltip title={isSLAPaused ? 'SLA is currently paused' : `SLA: ${formattedTime} ${!isBreached ? 'remaining' : ''}`}>
        <Chip
          icon={<StatusIcon fontSize="small" />}
          label={formattedTime}
          size="small"
          color={statusColor}
          sx={{
            fontWeight: 500,
            '& .MuiChip-icon': {
              fontSize: '1rem',
              color: 'inherit'
            }
          }}
        />
      </Tooltip>
    );
  }

  // Determine text status for the SLA
  const slaStatusText = isBreached 
    ? 'SLA Breached' 
    : slaStatus!.isFirstResponseBreached
      ? 'First Response Breached'
      : percentage >= 80 
        ? 'SLA Critical' 
        : percentage >= 50 
          ? 'SLA Due Soon' 
          : 'SLA On Track';

  // For detailed view (detail page), show the progress bar
  return (
    <Box>
      <Box sx={{ width: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Box display="flex" alignItems="center">
            <StatusIcon fontSize="small" sx={{ color: theme.palette[statusColor].main }} />
            <Typography variant="body2" fontWeight="medium" ml={0.5}>
              {slaStatusText}
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight="medium">
            {formattedTime}
          </Typography>
        </Box>
        
        <Box sx={{ position: 'relative', width: '100%', height: 8, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
          {/* Simplified and reliable progress bar implementation */}
          {(() => {
            // Define segments based on actual time values if available
            // We need to calculate the first response segment width as a fraction of total resolution time
            let firstResponseSegmentRatio = 0.3; // Default fallback
            
            // If we have both time values, calculate the actual ratio
            if (slaStatus?.firstResponseRemainingMinutes !== undefined && 
                slaStatus?.resolutionRemainingMinutes !== undefined) {
              
              // Get total times (remaining + elapsed)
              // Use negative values for breached SLAs to calculate correctly
              const firstResponseTotal = Math.abs(slaStatus.firstResponseRemainingMinutes) * (100 / Math.max(1, slaStatus.firstResponsePercentage));
              const resolutionTotal = Math.abs(slaStatus.resolutionRemainingMinutes) * (100 / Math.max(1, slaStatus.resolutionPercentage));
              
              // If we have valid totals, calculate ratio
              if (firstResponseTotal > 0 && resolutionTotal > 0) {
                firstResponseSegmentRatio = Math.max(0.1, Math.min(0.5, firstResponseTotal / resolutionTotal));
              }
            }
            
            // Calculate segment widths
            const firstResponseWidth = firstResponseSegmentRatio * 100;
            const resolutionWidth = 100 - firstResponseWidth;
            
            // Safe access to percentages with defaults
            const firstResponseElapsed = slaStatus?.firstResponsePercentage ?? 0;
            const resolutionElapsed = slaStatus?.resolutionPercentage ?? 0;
            
            // Check breach states
            const firstResponseBreached = slaStatus?.isFirstResponseBreached ?? false;
            const resolutionBreached = slaStatus?.isResolutionBreached ?? false;
            
            // ===== SEQUENTIAL PROGRESS LOGIC =====
            // Calculate first response progress - always based on its own percentage
            const firstResponseProgress = Math.min(100, firstResponseElapsed);
            
            // Calculate resolution progress - only start after first response is complete
            let resolutionProgress = 0;
            
            if (firstResponseBreached || firstResponseElapsed >= 100) {
              // If first response is complete or breached, resolution progresses normally
              resolutionProgress = Math.min(100, resolutionElapsed);
            } else {
              // Otherwise, resolution hasn't started yet
              resolutionProgress = 0;
            }
            
            // Calculate actual widths for display
            const firstResponseSegmentWidth = (firstResponseWidth * (firstResponseProgress / 100));
            const resolutionSegmentWidth = (resolutionWidth * (resolutionProgress / 100));
            
            // ===== COLOR LOGIC =====
            // Use the resolution percentage as the main indicator for overall SLA status
            // This ensures both segments change color consistently based on total elapsed time
            
            // Determine base color based on the overall SLA elapsed time (resolution percentage)
            let baseColor = theme.palette.success.main; // Default green
            
            // Change color based on overall SLA percentage
            if (resolutionElapsed >= 80) {
              baseColor = theme.palette.error.main; // Red when critical (80%+)
            } else if (resolutionElapsed >= 50) {
              baseColor = theme.palette.warning.main; // Yellow when warning (50%+)
            }
            
            // Handle breaches - always red when breached
            let firstResponseColor = firstResponseBreached 
              ? theme.palette.error.main // Always red if breached
              : baseColor; // Otherwise use the base color
              
            let resolutionColor = resolutionBreached
              ? theme.palette.error.main // Always red if breached
              : baseColor; // Otherwise use the base color
            
            return (
              <>
                {resolutionBreached ? (
                  // When fully breached, show the entire bar in red
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: '100%',
                      borderRadius: 4,
                      backgroundColor: theme.palette.error.main,
                    }}
                  />
                ) : (
                  // Otherwise show segments with appropriate colors
                  <>
                    {/* First Response Background */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${firstResponseWidth}%`,
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 4,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : 'rgba(0, 0, 0, 0.04)',
                      }}
                    />
                    
                    {/* First Response Progress */}
                    {firstResponseSegmentWidth > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${firstResponseSegmentWidth}%`,
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                          backgroundColor: firstResponseColor,
                          transition: 'width 0.3s, background-color 0.3s',
                        }}
                      />
                    )}
                    
                    {/* Resolution Background */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: `${firstResponseWidth}%`,
                        height: '100%',
                        width: `${resolutionWidth}%`,
                        borderTopRightRadius: 4,
                        borderBottomRightRadius: 4,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : 'rgba(0, 0, 0, 0.04)',
                      }}
                    />
                    
                    {/* Resolution Progress */}
                    {resolutionSegmentWidth > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: `${firstResponseWidth}%`,
                          height: '100%',
                          width: `${resolutionSegmentWidth}%`,
                          borderTopRightRadius: resolutionSegmentWidth === resolutionWidth ? 4 : 0,
                          borderBottomRightRadius: resolutionSegmentWidth === resolutionWidth ? 4 : 0,
                          backgroundColor: resolutionColor,
                          transition: 'width 0.3s, background-color 0.3s',
                        }}
                      />
                    )}
                  </>
                )}
                
                {/* Segment divider line - always show to separate segments */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: `${firstResponseWidth}%`,
                    height: '100%',
                    width: '1px',
                    backgroundColor: theme.palette.divider,
                    zIndex: 2,
                  }}
                />
              </>
            );
          })()}
        </Box>
        
        {/* Progress bar labels */}
        <Box display="flex" justifyContent="space-between" mt={0.5}>
          <Typography variant="caption" color="text.secondary">
            First Response
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Resolution
          </Typography>
        </Box>
      </Box>
      
      {/* Detailed SLA status information display */}
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>First Response:</strong> {slaStatus!.isFirstResponseBreached 
            ? <Box component="span">
                {formatTimeLeft(slaStatus!.firstResponseRemainingMinutes, true)}
                <Typography component="span" color="error"> (Breached)</Typography>
          </Box>
            : formatTimeLeft(slaStatus!.firstResponseRemainingMinutes, false)
          }
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          <strong>Resolution:</strong> {slaStatus!.isResolutionBreached
            ? <Box component="span">
                {formatTimeLeft(slaStatus!.resolutionRemainingMinutes, true)}
                <Typography component="span" color="error"> (Breached)</Typography>
          </Box>
            : formatTimeLeft(slaStatus!.resolutionRemainingMinutes, false)
          }
        </Typography>
        
        {/* Show SLA Policy name if available */}
        {slaStatus!.slaInfo && (
          <Typography variant="body2" color="text.secondary">
            <strong>Policy:</strong> {slaStatus!.slaInfo.slaPolicy?.name || 'Default SLA Policy'}
          </Typography>
        )}
        </Box>
    </Box>
  );
};

export default SLABadge; 