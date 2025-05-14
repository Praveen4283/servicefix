import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import {
  AccessTime as ClockIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import slaService, { SLAPolicy } from '../../services/slaService';
import { useAuth } from '../../context/AuthContext';

interface AssignSLAModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  onAssign: () => void; // Callback to refresh ticket data
}

const AssignSLAModal: React.FC<AssignSLAModalProps> = ({
  open,
  onClose,
  ticketId,
  onAssign,
}) => {
  const theme = useTheme();
  const { user } = useAuth();

  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch SLA policies when modal opens
  useEffect(() => {
    const fetchSLAPolicies = async () => {
      if (!open || !user?.organizationId) return;
      
      setLoading(true);
      
      try {
        const policies = await slaService.getSLAPolicies(Number(user.organizationId));
        setSlaPolicies(policies);
        setError(null);
      } catch (err) {
        console.error('Error fetching SLA policies:', err);
        setError('Failed to load SLA policies. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSLAPolicies();
  }, [open, user?.organizationId]);

  const handlePolicyChange = (event: SelectChangeEvent<number>) => {
    setSelectedPolicyId(event.target.value as number);
  };

  const handleAssign = async () => {
    if (!selectedPolicyId) {
      setError('Please select an SLA policy');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await slaService.assignSLAToTicket(ticketId, selectedPolicyId as number);
      onAssign();
      onClose();
    } catch (err) {
      console.error('Error assigning SLA policy to ticket:', err);
      setError('Failed to assign SLA policy. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={!submitting ? onClose : undefined} fullWidth maxWidth="sm">
      <DialogTitle>Assign SLA Policy</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Assign an SLA policy to define the expected response and resolution times for this ticket.
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth disabled={loading || submitting}>
            <InputLabel id="sla-policy-select-label">SLA Policy</InputLabel>
            <Select
              labelId="sla-policy-select-label"
              id="sla-policy-select"
              value={selectedPolicyId}
              onChange={handlePolicyChange}
              label="SLA Policy"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              
              {slaPolicies.map((policy) => (
                <MenuItem key={policy.id} value={policy.id}>
                  {policy.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : selectedPolicyId && (
          <Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Policy Details
            </Typography>
            
            {slaPolicies
              .filter((policy) => policy.id === selectedPolicyId)
              .map((policy) => (
                <Box key={policy.id} sx={{ p: 2, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {policy.name}
                  </Typography>
                  
                  {policy.description && (
                    <Typography variant="body2" sx={{ mb: 1 }} color="textSecondary">
                      {policy.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ClockIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                      <Typography variant="body2">
                        First Response: {policy.firstResponseHours} hours
                      </Typography>
                    </Box>
                    
                    {policy.nextResponseHours && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ClockIcon fontSize="small" sx={{ mr: 1, color: theme.palette.info.main }} />
                        <Typography variant="body2">
                          Next Response: {policy.nextResponseHours} hours
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ClockIcon fontSize="small" sx={{ mr: 1, color: theme.palette.secondary.main }} />
                      <Typography variant="body2">
                        Resolution: {policy.resolutionHours} hours
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon fontSize="small" sx={{ mr: 1, color: theme.palette.info.main }} />
                      <Typography variant="body2">
                        {policy.businessHoursOnly ? 'Applies during business hours only' : 'Applies 24/7'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAssign}
          disabled={!selectedPolicyId || submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : null}
        >
          {submitting ? 'Assigning...' : 'Assign SLA Policy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignSLAModal; 