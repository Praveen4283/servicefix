import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Grid, 
  Typography, 
  CircularProgress, 
  Box,
  Paper,
  Stack
} from '@mui/material';
import { 
  DatePicker
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { 
  CheckCircle as CheckCircleIcon, 
  Warning as WarningIcon, 
  AccessTime as ClockIcon 
} from '@mui/icons-material';
import axios from 'axios';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

interface SLAMetrics {
  totalTickets: number;
  responseSlaMet: number;
  responseSlaMissed: number;
  resolutionSlaMet: number;
  resolutionSlaMissed: number;
  responseCompliancePercentage: number;
  resolutionCompliancePercentage: number;
}

interface SLAMetricsCardProps {
  organizationId: number;
}

const SLAMetricsCard: React.FC<SLAMetricsCardProps> = ({ organizationId }) => {
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date()); // Default to today
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMetrics = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Get token from localStorage
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(`${config.api.baseUrl}/api/sla/metrics`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      
      setMetrics(response.data.data);
    } catch (error) {
      console.error('Error fetching SLA metrics:', error);
      setError('Failed to load SLA metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [organizationId, startDate, endDate]);

  if (!metrics && loading) {
    return (
      <Card elevation={3}>
        <CardHeader title="SLA Compliance" />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardHeader 
      title="SLA Compliance" 
        action={
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction="row" spacing={2}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => newValue && setStartDate(newValue)}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => newValue && setEndDate(newValue)}
          />
            </Stack>
          </LocalizationProvider>
      }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" color="textSecondary">
                Total Tickets
              </Typography>
              <Typography variant="h4">
                {metrics?.totalTickets || 0}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                First Response SLA
              </Typography>
              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={Math.round(metrics?.responseCompliancePercentage || 0)}
                      color={(metrics?.responseCompliancePercentage || 0) < 80 ? 'error' : 'success'}
                      size={80}
                />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div" color="text.secondary">
                        {`${Math.round(metrics?.responseCompliancePercentage || 0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      Met: {metrics?.responseSlaMet || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon sx={{ color: 'error.main', mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      Missed: {metrics?.responseSlaMissed || 0}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Resolution SLA
              </Typography>
              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={Math.round(metrics?.resolutionCompliancePercentage || 0)}
                      color={(metrics?.resolutionCompliancePercentage || 0) < 80 ? 'error' : 'success'}
                      size={80}
                />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div" color="text.secondary">
                        {`${Math.round(metrics?.resolutionCompliancePercentage || 0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      Met: {metrics?.resolutionSlaMet || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon sx={{ color: 'error.main', mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      Missed: {metrics?.resolutionSlaMissed || 0}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SLAMetricsCard; 