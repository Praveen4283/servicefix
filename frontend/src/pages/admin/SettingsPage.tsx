import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  alpha,
  Zoom,
  Grow,
  CardHeader,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Badge,
  Link,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Email as EmailIcon,
  ConfirmationNumber as TicketIcon,
  IntegrationInstructions as IntegrationsIcon,
  Build as AdvancedIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  GitHub as GitHubIcon,
  BugReport as JiraIcon,
  Chat as TeamsIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  ChatBubble as SlackIcon,
  Error as ErrorIcon,
  AccessTime as ClockIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { 
  pageContainer,
  pageHeaderSection, 
  cardStyleSx, 
  sectionCardStyleSx,
  buttonAnimation,
} from '../../styles/commonStyles';
import settingsService from '../../services/settingsService';
import slaService, { SLAPolicy } from '../../services/slaService';
import ticketPriorityService from '../../services/ticketPriorityService';
import { useAuth } from '../../context/AuthContext';
import { 
  GeneralSettings, 
  EmailSettings, 
  TicketSettings,
  IntegrationSettings,
  AdvancedSettings,
  ValidationErrors,
  NotificationState
} from '../../types/settings';
import { useLocation } from 'react-router-dom';

// Type definitions for better type safety
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Reusable form field component
interface FormFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  fullWidth?: boolean;
  margin?: 'none' | 'dense' | 'normal';
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  fullWidth = true,
  margin = 'normal',
  required = false,
  error = false,
  helperText,
  disabled = false,
}) => (
  <TextField
    fullWidth={fullWidth}
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    margin={margin}
    type={type}
    required={required}
    error={error}
    helperText={helperText}
    disabled={disabled}
    inputProps={{
      'aria-label': label,
    }}
    sx={{
      '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.02),
        },
        '&.Mui-focused': {
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
        }
      }
    }}
  />
);

// Modified TabPanel component to prevent transition issues
const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      style={{ display: value === index ? 'block' : 'none' }}
      {...other}
    >
      {/* We always render children but hide them with CSS */}
      <Box sx={{ py: 3 }}>{children}</Box>
    </div>
  );
};

// Enhanced card component with animation
const EnhancedCard = (props: any) => {
  const { disableHoverEffect, ...rest } = props;
  return (
    <Zoom in={true} style={{ transitionDelay: props.index ? `${props.index * 100}ms` : '0ms' }}>
      <Card 
        {...rest}
        sx={{
          ...(props.sx || {}),
          transition: 'all 0.3s ease',
          borderRadius: 3,
          boxShadow: (theme: any) => theme.palette.mode === 'dark'
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          '&:hover': disableHoverEffect ? {} : {
            transform: 'translateY(-5px)',
            boxShadow: (theme: any) => theme.palette.mode === 'dark'
              ? '0 12px 40px -8px rgba(0, 0, 0, 0.4)'
              : '0 12px 40px -8px rgba(0, 0, 0, 0.15)',
          }
        }}
      />
    </Zoom>
  );
};

const EnhancedGrid = (props: any) => {
  return (
    <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDuration: '800ms' }}>
      <Grid {...props} />
    </Grow>
  );
};

// Modern card styles
const cardStyles = {
  elevation: 0,
  borderRadius: 3,
  transition: 'all 0.3s ease',
  background: (theme: any) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.paper, 0.8),
  boxShadow: (theme: any) => theme.palette.mode === 'dark'
    ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: (theme: any) => theme.palette.mode === 'dark'
      ? '0 12px 40px -8px rgba(0, 0, 0, 0.4)'
      : '0 12px 40px -8px rgba(0, 0, 0, 0.15)',
  },
  overflow: 'hidden', // Ensure the gradient doesn't overflow the card
};

// Gradient accent for cards
const gradientAccent = (theme: any) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`
      : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: 1,
    overflow: 'hidden'
  }
});

// Add interface to manage ticket priority in the component
interface TicketPriority {
  id: number;
  name: string;
  color: string;
  slaHours?: number;
  organizationId: number;
}

// Add interface for the SLA form state
interface SLAFormState {
  priorityId: number;
  firstResponseHours: number;
  nextResponseHours: number;
  resolutionHours: number;
  businessHoursOnly: boolean;
  isNew?: boolean; // Added isNew property to fix linter errors
}

const SettingsPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  
  // Provide a default organization ID to avoid user.organizationId being null
  const defaultOrgId = 1001;
  
  // Tab state
  const [value, setValue] = useState<number>(0);
  const [pendingTabValue, setPendingTabValue] = useState<number | null>(null);
  
  // Add TabsRef to handle MUI Tabs error
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState({
    general: false,
    email: false,
    ticket: false,
    integration: false,
    advanced: false
  });
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    type: 'success',
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [nextTabIndex, setNextTabIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [loadingPriorities, setLoadingPriorities] = useState(false);
  const [slaForm, setSlaForm] = useState<SLAFormState>({
    priorityId: 0,
    firstResponseHours: 4,
    nextResponseHours: 8,
    resolutionHours: 24,
    businessHoursOnly: true,
    isNew: true // Initialize with isNew: true
  });
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [loadingSlaPolicies, setLoadingSlaPolicies] = useState(false);
  const [savingSlaPolicies, setSavingSlaPolicies] = useState(false);
  const [slaError, setSlaError] = useState<string | null>(null);

  // General settings
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    companyName: '',
    supportEmail: '',
    maxFileSize: 5, // MB
    allowGuestTickets: true,
    defaultTimeZone: 'UTC',
  });

  // Original settings to compare against for dirty state
  const [originalGeneralSettings, setOriginalGeneralSettings] = useState<GeneralSettings>({
    ...generalSettings
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpServer: 'smtp.mailgun.org',
    smtpPort: 587,
    smtpUsername: 'postmaster@sandboxeca4aa11a2a34b0d969c416f32d7686d.mailgun.org',
    smtpPassword: '••••••••••••',
    emailFromName: 'ServiceFix Support',
    emailReplyTo: 'support@servicefix.com',
    enableEmailNotifications: true,
  });

  const [originalEmailSettings, setOriginalEmailSettings] = useState<EmailSettings>({
    ...emailSettings
  });

  // Ticket settings
  const [ticketSettings, setTicketSettings] = useState<TicketSettings>({
    defaultPriority: 'medium',
    closedTicketReopen: 7, // days
    autoCloseResolved: 3, // days
    enableCustomerSatisfaction: true,
    requireCategory: true,
    enableSLA: false,
  });

  const [originalTicketSettings, setOriginalTicketSettings] = useState<TicketSettings>({
    ...ticketSettings
  });
  
  // Integration settings
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    // Slack Integration
    slackEnabled: false,
    slackWebhookUrl: '',
    slackChannel: '',
    slackNotifyOnNewTicket: true,
    slackNotifyOnTicketUpdates: false,
    
    // Microsoft Teams Integration
    teamsEnabled: false,
    teamsWebhookUrl: '',
    teamsNotifyOnNewTicket: true,
    teamsNotifyOnTicketUpdates: false,

    // Jira Integration
    jiraEnabled: false,
    jiraUrl: '',
    jiraUsername: '',
    jiraApiToken: '',
    jiraProject: '',
    jiraCreateIssuesForTickets: true,
    
    // GitHub Integration
    githubEnabled: false,
    githubAccessToken: '',
    githubRepository: '',
    githubCreateIssuesForTickets: true
  });

  const [originalIntegrationSettings, setOriginalIntegrationSettings] = useState<IntegrationSettings>({
    ...integrationSettings
  });

  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    // API settings
    apiEnabled: true,
    apiRateLimitPerHour: 1000,
    enableApiDocumentation: true,
    
    // Security settings
    maxLoginAttempts: 5,
    passwordExpiryDays: 90,
    sessionTimeoutMinutes: 60,
    enforceMfa: false,
    
    // Performance settings
    cacheDurationMinutes: 15,
    maxConcurrentFileUploads: 5,
    
    // Custom fields
    enableCustomFields: true,
    maxCustomFieldsPerTicket: 10,
    
    // AI features
    enableAiSuggestions: true,
    enableAutoTagging: true,
    enableSentimentAnalysis: true,
    aiModelName: 'gpt-3.5-turbo'
  });

  const [originalAdvancedSettings, setOriginalAdvancedSettings] = useState<AdvancedSettings>({
    ...advancedSettings
  });

  // Load all settings on initial render
  useEffect(() => {
    fetchAllSettings();
    fetchTicketPriorities();
    fetchSLAPolicies();
    
    // Check if we have an initialTab passed from navigation state
    const state = location.state as { initialTab?: number } | null;
    if (state && typeof state.initialTab === 'number') {
      setValue(state.initialTab);
    }
  }, [location]);
  
  // Fetch all settings from the API
  const fetchAllSettings = async () => {
    setApiError(null);
    await Promise.all([
      fetchGeneralSettings(),
      fetchEmailSettings(),
      fetchTicketSettings(),
      fetchIntegrationSettings(),
      fetchAdvancedSettings()
    ]);
  };
  
  // Fetch general settings
  const fetchGeneralSettings = async () => {
    try {
      setLoadingSettings(prev => ({ ...prev, general: true }));
      
      // Simulate API call with a timeout
      // In production, use: const data = await settingsService.getGeneralSettings();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const data: GeneralSettings = {
        companyName: 'Acme Corporation',
        supportEmail: 'support@acmecorp.com',
        maxFileSize: 5,
        allowGuestTickets: true,
        defaultTimeZone: 'UTC',
      };
      
      setGeneralSettings(data);
      setOriginalGeneralSettings(data);
    } catch (error) {
      console.error('Error fetching general settings:', error);
      setApiError('Failed to load general settings. Please try again.');
      setNotification({
        open: true,
        message: 'Failed to load general settings',
        type: 'error',
      });
    } finally {
      setLoadingSettings(prev => ({ ...prev, general: false }));
    }
  };
  
  // Fetch email settings
  const fetchEmailSettings = async () => {
    try {
      setLoadingSettings(prev => ({ ...prev, email: true }));
      const data = await settingsService.getEmailSettings();
      
      if (data && typeof data === 'object') {
        setEmailSettings(data);
        setOriginalEmailSettings(data);
        setApiError(null); // Clear previous errors on success
      } else {
        // This case should ideally not happen if service layer normalizes response
        throw new Error('Invalid data format received for email settings');
      }
    } catch (error: any) {
      console.error('Error fetching email settings:', error);
      setEmailSettings(null as any); // Explicitly set to null on error to trigger error UI
      setOriginalEmailSettings(null as any); // Also set original to null
      setApiError(`Failed to load email settings: ${error.message || 'Unknown error'}`);
      setNotification({
        open: true,
        message: `Failed to load email settings: ${error.message || 'Unknown error'}`,
        type: 'error',
      });
    } finally {
      setLoadingSettings(prev => ({ ...prev, email: false }));
    }
  };
  
  // Fetch ticket settings
  const fetchTicketSettings = async () => {
    try {
      setLoadingSettings(prev => ({ ...prev, ticket: true }));
      
      // Call the service to get actual ticket settings
      const response = await settingsService.getTicketSettings();
      console.log('Loaded ticket settings:', response);
      
      // If we have valid data, use it
      if (response && typeof response === 'object') {
        setTicketSettings(response);
        setOriginalTicketSettings(response);
      } else {
        // Fallback to defaults if no settings found
        const defaultData: TicketSettings = {
        defaultPriority: 'medium',
        closedTicketReopen: 7,
        autoCloseResolved: 3,
        enableCustomerSatisfaction: true,
        requireCategory: true,
        enableSLA: false,
      };
      
        setTicketSettings(defaultData);
        setOriginalTicketSettings(defaultData);
      }
    } catch (error) {
      console.error('Error fetching ticket settings:', error);
      setApiError('Failed to load ticket settings. Please try again.');
      setNotification({
        open: true,
        message: 'Failed to load ticket settings',
        type: 'error',
      });
      
      // Set defaults on error
      const defaultData: TicketSettings = {
        defaultPriority: 'medium',
        closedTicketReopen: 7,
        autoCloseResolved: 3,
        enableCustomerSatisfaction: true,
        requireCategory: true,
        enableSLA: false,
      };
      
      setTicketSettings(defaultData);
      setOriginalTicketSettings(defaultData);
    } finally {
      setLoadingSettings(prev => ({ ...prev, ticket: false }));
    }
  };
  
  // Fetch integration settings
  const fetchIntegrationSettings = async () => {
    try {
      setLoadingSettings(prev => ({ ...prev, integration: true }));
      
      // Simulate API call with a timeout
      // In production, use: const data = await settingsService.getIntegrationSettings();
      await new Promise(resolve => setTimeout(resolve, 1500));
      const data: IntegrationSettings = {
        // Slack Integration
        slackEnabled: true,
        slackWebhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
        slackChannel: '#support-tickets',
        slackNotifyOnNewTicket: true,
        slackNotifyOnTicketUpdates: false,
        
        // Microsoft Teams Integration
        teamsEnabled: false,
        teamsWebhookUrl: '',
        teamsNotifyOnNewTicket: true,
        teamsNotifyOnTicketUpdates: false,

        // Jira Integration
        jiraEnabled: true,
        jiraUrl: 'https://acmecorp.atlassian.net',
        jiraUsername: 'jira-api-user',
        jiraApiToken: '••••••••••••••••',
        jiraProject: 'SUP',
        jiraCreateIssuesForTickets: true,
        
        // GitHub Integration
        githubEnabled: false,
        githubAccessToken: '',
        githubRepository: '',
        githubCreateIssuesForTickets: true
      };
      
      setIntegrationSettings(data);
      setOriginalIntegrationSettings(data);
    } catch (error) {
      console.error('Error fetching integration settings:', error);
      setApiError('Failed to load integration settings. Please try again.');
      setNotification({
        open: true,
        message: 'Failed to load integration settings',
        type: 'error',
      });
    } finally {
      setLoadingSettings(prev => ({ ...prev, integration: false }));
    }
  };
  
  // Fetch advanced settings
  const fetchAdvancedSettings = async () => {
    try {
      setLoadingSettings(prev => ({ ...prev, advanced: true }));
      
      // Simulate API call with a timeout
      // In production, use: const data = await settingsService.getAdvancedSettings();
      await new Promise(resolve => setTimeout(resolve, 1200));
      const data: AdvancedSettings = {
        // API settings
        apiEnabled: true,
        apiRateLimitPerHour: 1000,
        enableApiDocumentation: true,
        
        // Security settings
        maxLoginAttempts: 5,
        passwordExpiryDays: 90,
        sessionTimeoutMinutes: 60,
        enforceMfa: false,
        
        // Performance settings
        cacheDurationMinutes: 15,
        maxConcurrentFileUploads: 5,
        
        // Custom fields
        enableCustomFields: true,
        maxCustomFieldsPerTicket: 10,
        
        // AI features
        enableAiSuggestions: true,
        enableAutoTagging: true,
        enableSentimentAnalysis: true,
        aiModelName: 'gpt-3.5-turbo'
      };
      
      setAdvancedSettings(data);
      setOriginalAdvancedSettings(data);
    } catch (error) {
      console.error('Error fetching advanced settings:', error);
      setApiError('Failed to load advanced settings. Please try again.');
      setNotification({
        open: true,
        message: 'Failed to load advanced settings',
        type: 'error',
      });
    } finally {
      setLoadingSettings(prev => ({ ...prev, advanced: false }));
    }
  };

  // Check for unsaved changes
  useEffect(() => {
    const isGeneralDirty = JSON.stringify(generalSettings) !== JSON.stringify(originalGeneralSettings);
    const isEmailDirty = JSON.stringify(emailSettings) !== JSON.stringify(originalEmailSettings);
    const isTicketDirty = JSON.stringify(ticketSettings) !== JSON.stringify(originalTicketSettings);
    
    setUnsavedChanges(isGeneralDirty || isEmailDirty || isTicketDirty);
    
    // When ticket SLA settings are enabled/disabled, refresh SLA policies
    if (ticketSettings.enableSLA !== originalTicketSettings.enableSLA) {
      fetchSLAPolicies();
    }
  }, [generalSettings, emailSettings, ticketSettings, originalGeneralSettings, originalEmailSettings, originalTicketSettings]);

  // Prompt user when leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedChanges]);

  const validateForm = (settingsType: string): boolean => {
    const newErrors: ValidationErrors = { ...validationErrors };
    
    if (settingsType === 'general') {
      newErrors.generalSettings = {};
      
      if (!generalSettings.companyName.trim()) {
        newErrors.generalSettings.companyName = 'Company name is required';
      }
      
      if (!generalSettings.supportEmail.trim()) {
        newErrors.generalSettings.supportEmail = 'Support email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(generalSettings.supportEmail)) {
        newErrors.generalSettings.supportEmail = 'Invalid email format';
      }
      
      if (generalSettings.maxFileSize <= 0) {
        newErrors.generalSettings.maxFileSize = 'Max file size must be greater than 0';
      }
    } else if (settingsType === 'email') {
      newErrors.emailSettings = {};
      
      if (!emailSettings.smtpServer.trim()) {
        newErrors.emailSettings.smtpServer = 'SMTP server is required';
      }
      
      if (emailSettings.smtpPort <= 0 || emailSettings.smtpPort > 65535) {
        newErrors.emailSettings.smtpPort = 'Port must be between 1 and 65535';
      }
      
      if (!emailSettings.smtpUsername.trim()) {
        newErrors.emailSettings.smtpUsername = 'SMTP username is required';
      }
      
      if (!emailSettings.emailReplyTo.trim()) {
        newErrors.emailSettings.emailReplyTo = 'Reply-to email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSettings.emailReplyTo)) {
        newErrors.emailSettings.emailReplyTo = 'Invalid email format';
      }
    } else if (settingsType === 'ticket') {
      newErrors.ticketSettings = {};
      
      if (ticketSettings.closedTicketReopen < 0) {
        newErrors.ticketSettings.closedTicketReopen = 'Must be 0 or greater';
      }
      
      if (ticketSettings.autoCloseResolved < 0) {
        newErrors.ticketSettings.autoCloseResolved = 'Must be 0 or greater';
      }
    } else if (settingsType === 'integration') {
      newErrors.integrationSettings = {};
      
      // Validate Slack settings if enabled
      if (integrationSettings.slackEnabled) {
        if (!integrationSettings.slackWebhookUrl.trim()) {
          newErrors.integrationSettings.slackWebhookUrl = 'Webhook URL is required when Slack is enabled';
        } else if (!integrationSettings.slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
          newErrors.integrationSettings.slackWebhookUrl = 'Invalid Slack webhook URL format';
        }
        
        if (!integrationSettings.slackChannel.trim()) {
          newErrors.integrationSettings.slackChannel = 'Channel is required when Slack is enabled';
        }
      }
      
      // Validate Teams settings if enabled
      if (integrationSettings.teamsEnabled) {
        if (!integrationSettings.teamsWebhookUrl.trim()) {
          newErrors.integrationSettings.teamsWebhookUrl = 'Webhook URL is required when Teams is enabled';
        } else if (!integrationSettings.teamsWebhookUrl.startsWith('https://')) {
          newErrors.integrationSettings.teamsWebhookUrl = 'Invalid Teams webhook URL format';
        }
      }
      
      // Validate Jira settings if enabled
      if (integrationSettings.jiraEnabled) {
        if (!integrationSettings.jiraUrl.trim()) {
          newErrors.integrationSettings.jiraUrl = 'Jira URL is required when Jira is enabled';
        } else if (!integrationSettings.jiraUrl.startsWith('https://')) {
          newErrors.integrationSettings.jiraUrl = 'Jira URL must use HTTPS';
        }
        
        if (!integrationSettings.jiraUsername.trim()) {
          newErrors.integrationSettings.jiraUsername = 'Username is required when Jira is enabled';
        }
        
        if (!integrationSettings.jiraApiToken.trim()) {
          newErrors.integrationSettings.jiraApiToken = 'API token is required when Jira is enabled';
        }
        
        if (!integrationSettings.jiraProject.trim()) {
          newErrors.integrationSettings.jiraProject = 'Project key is required when Jira is enabled';
        }
      }
      
      // Validate GitHub settings if enabled
      if (integrationSettings.githubEnabled) {
        if (!integrationSettings.githubAccessToken.trim()) {
          newErrors.integrationSettings.githubAccessToken = 'Access token is required when GitHub is enabled';
        }
        
        if (!integrationSettings.githubRepository.trim()) {
          newErrors.integrationSettings.githubRepository = 'Repository is required when GitHub is enabled';
        }
      }
    } else if (settingsType === 'advanced') {
      newErrors.advancedSettings = {};
      
      // Validate API settings
      if (advancedSettings.apiRateLimitPerHour <= 0) {
        newErrors.advancedSettings.apiRateLimitPerHour = 'API rate limit must be greater than 0';
      }
      
      // Validate security settings
      if (advancedSettings.maxLoginAttempts <= 0) {
        newErrors.advancedSettings.maxLoginAttempts = 'Max login attempts must be greater than 0';
      }
      
      if (advancedSettings.passwordExpiryDays < 0) {
        newErrors.advancedSettings.passwordExpiryDays = 'Password expiry days must be 0 or greater';
      }
      
      if (advancedSettings.sessionTimeoutMinutes <= 0) {
        newErrors.advancedSettings.sessionTimeoutMinutes = 'Session timeout must be greater than 0';
      }
      
      // Validate performance settings
      if (advancedSettings.cacheDurationMinutes < 0) {
        newErrors.advancedSettings.cacheDurationMinutes = 'Cache duration must be 0 or greater';
      }
      
      if (advancedSettings.maxConcurrentFileUploads <= 0) {
        newErrors.advancedSettings.maxConcurrentFileUploads = 'Max concurrent uploads must be greater than 0';
      }
      
      // Validate custom fields settings
      if (advancedSettings.enableCustomFields && advancedSettings.maxCustomFieldsPerTicket <= 0) {
        newErrors.advancedSettings.maxCustomFieldsPerTicket = 'Max custom fields must be greater than 0';
      }
    }
    
    setValidationErrors(newErrors);
    
    // Check if there are any errors for the current settings type
    const currentErrors = 
      settingsType === 'general' ? newErrors.generalSettings :
      settingsType === 'email' ? newErrors.emailSettings :
      settingsType === 'ticket' ? newErrors.ticketSettings : 
      settingsType === 'integration' ? newErrors.integrationSettings :
      settingsType === 'advanced' ? newErrors.advancedSettings :
      undefined;
    
    return !currentErrors || Object.keys(currentErrors).length === 0;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (unsavedChanges) {
      setNextTabIndex(newValue);
      setShowLeaveDialog(true);
    } else {
    setValue(newValue);
    }
  };

  const handleConfirmTabChange = () => {
    if (nextTabIndex !== null) {
      setValue(nextTabIndex);
      setShowLeaveDialog(false);
      setNextTabIndex(null);
    }
  };

  const handleCancelTabChange = () => {
    setShowLeaveDialog(false);
    setNextTabIndex(null);
  };

  const handleGeneralSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setGeneralSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
    
    // Clear validation error for this field if it exists
    if (validationErrors.generalSettings && validationErrors.generalSettings[name as keyof GeneralSettings]) {
      setValidationErrors((prev) => ({
        ...prev,
        generalSettings: {
          ...prev.generalSettings,
          [name]: undefined
        }
      }));
    }
  };

  const handleEmailSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setEmailSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
    
    // Clear validation error for this field if it exists
    if (validationErrors.emailSettings && validationErrors.emailSettings[name as keyof EmailSettings]) {
      setValidationErrors((prev) => ({
        ...prev,
        emailSettings: {
          ...prev.emailSettings,
          [name]: undefined
        }
      }));
    }
  };

  // Modify the handleTicketSettingsChange function to also handle SLA form changes
  const handleTicketSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setTicketSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
    
    // Clear validation error for this field if it exists
    if (validationErrors.ticketSettings && validationErrors.ticketSettings[name as keyof TicketSettings]) {
      setValidationErrors((prev) => ({
        ...prev,
        ticketSettings: {
          ...prev.ticketSettings,
          [name]: undefined
        }
      }));
    }
  };

  const handleIntegrationSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setIntegrationSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear validation error for this field if it exists
    if (validationErrors.integrationSettings && validationErrors.integrationSettings[name as keyof IntegrationSettings]) {
      setValidationErrors((prev) => ({
        ...prev,
        integrationSettings: {
          ...prev.integrationSettings,
          [name]: undefined
        }
      }));
    }
  };

  const handleAdvancedSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setAdvancedSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
    
    // Clear validation error for this field if it exists
    if (validationErrors.advancedSettings && validationErrors.advancedSettings[name as keyof AdvancedSettings]) {
      setValidationErrors((prev) => ({
        ...prev,
        advancedSettings: {
          ...prev.advancedSettings,
          [name]: undefined
        }
      }));
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>, settingsType: string) => {
    const { name, value } = e.target;
    if (!name) return;

    switch (settingsType) {
      case 'general':
        setGeneralSettings((prev) => ({ ...prev, [name]: value }));
        break;
      case 'ticket':
        setTicketSettings((prev) => ({ ...prev, [name]: value }));
        break;
      default:
        break;
    }
  };

  // Define different save handlers for each settings section
  const handleSaveGeneralSettings = async () => {
    if (!validateForm('general')) {
      setNotification({
        open: true,
        message: 'Please correct the errors before saving',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the actual settings service instead of using mock data
      const result = await settingsService.updateGeneralSettings(generalSettings);
      
      setOriginalGeneralSettings(result);
      setNotification({
        open: true,
        message: 'General settings saved successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving general settings:', error);
      setNotification({
        open: true,
        message: 'Failed to save general settings. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!validateForm('email')) {
      setNotification({
        open: true,
        message: 'Please correct the errors before saving',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // In production, use: const result = await settingsService.updateEmailSettings(emailSettings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = { ...emailSettings };
      
      setOriginalEmailSettings(result);
      setNotification({
        open: true,
        message: 'Email settings saved successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      setNotification({
        open: true,
        message: 'Failed to save email settings. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrationSettings = async () => {
    if (!validateForm('integration')) {
      setNotification({
        open: true,
        message: 'Please correct the errors before saving',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // In production, use: const result = await settingsService.updateIntegrationSettings(integrationSettings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = { ...integrationSettings };
      
      setOriginalIntegrationSettings(result);
      setNotification({
        open: true,
        message: 'Integration settings saved successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving integration settings:', error);
      setNotification({
        open: true,
        message: 'Failed to save integration settings. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdvancedSettings = async () => {
    if (!validateForm('advanced')) {
      setNotification({
        open: true,
        message: 'Please correct the errors before saving',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // In production, use: const result = await settingsService.updateAdvancedSettings(advancedSettings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = { ...advancedSettings };
      
      setOriginalAdvancedSettings(result);
      setNotification({
        open: true,
        message: 'Advanced settings saved successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving advanced settings:', error);
      setNotification({
        open: true,
        message: 'Failed to save advanced settings. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle saving ticket settings including SLA policies
  const handleSaveTicketSettings = async () => {
    if (!validateForm('ticket')) {
      setNotification({
        open: true,
        message: 'Please correct the errors before saving',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the real service to save ticket settings
      const result = await settingsService.updateTicketSettings(ticketSettings);
      
      setOriginalTicketSettings(result);
      
      // After saving, also sync SLA policies if SLA is enabled
      if (ticketSettings.enableSLA) {
        await syncSLAPoliciesToSettings();
      }
      
      setNotification({
        open: true,
        message: 'Ticket settings saved successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving ticket settings:', error);
      setNotification({
        open: true,
        message: `Failed to save ticket settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a new function to sync SLA policies to the settings table
  const syncSLAPoliciesToSettings = async () => {
    try {
      console.log('Syncing SLA policies to settings table...');
      // Get the latest policies from the SLA service
      const latestPolicies = await slaService.getSLAPolicies(defaultOrgId);
      
      if (latestPolicies && latestPolicies.length > 0) {
        console.log(`Syncing ${latestPolicies.length} SLA policies to settings table`);
        
        // Save to settings table
        const response = await settingsService.updateSLASettings({
          organizationId: defaultOrgId,
          policies: latestPolicies
        });
        
        console.log('SLA policies successfully synced to settings table', response);
      } else {
        console.warn('No SLA policies to sync to settings table');
      }
    } catch (error) {
      console.error('Error syncing SLA policies to settings table:', error);
      // Don't show notification for background sync failure
    }
  };

  // Add handleTestEmailSettings function
  const handleTestEmailSettings = async () => {
    if (!validateForm('email')) {
      setNotification({
        open: true,
        message: 'Please correct the errors before testing',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Use the real API to test email settings
      const result = await settingsService.testEmailSettings(emailSettings);
      
      setNotification({
        open: true,
        message: result.message || 'Test email sent successfully. Please check your inbox.',
        type: result.success ? 'success' : 'error',
      });
    } catch (error) {
      console.error('Error testing email settings:', error);
      setNotification({
        open: true,
        message: 'Failed to send test email. Please check your configuration.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Memoized error getter functions for improved performance
  const getGeneralError = useCallback(
    (fieldName: keyof GeneralSettings) => 
      validationErrors.generalSettings && validationErrors.generalSettings[fieldName],
    [validationErrors.generalSettings]
  );
  
  const getEmailError = useCallback(
    (fieldName: keyof EmailSettings) => 
      validationErrors.emailSettings && validationErrors.emailSettings[fieldName],
    [validationErrors.emailSettings]
  );
  
  const getTicketError = useCallback(
    (fieldName: keyof TicketSettings) => 
      validationErrors.ticketSettings && validationErrors.ticketSettings[fieldName],
    [validationErrors.ticketSettings]
  );
  
  const getIntegrationError = useCallback(
    (fieldName: keyof IntegrationSettings) => 
      validationErrors.integrationSettings && validationErrors.integrationSettings[fieldName],
    [validationErrors.integrationSettings]
  );
  
  const getAdvancedError = useCallback(
    (fieldName: keyof AdvancedSettings) => 
      validationErrors.advancedSettings && validationErrors.advancedSettings[fieldName],
    [validationErrors.advancedSettings]
  );

  const handleRefreshData = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    
    // Fetch all settings
    fetchAllSettings()
      .then(() => {
        setNotification({
          open: true,
          message: 'Settings refreshed successfully',
          type: 'success',
        });
      })
      .catch((error) => {
        console.error('Error refreshing settings:', error);
        setNotification({
          open: true,
          message: 'Failed to refresh settings',
          type: 'error',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Test integration connection
  const handleTestIntegration = async (type: string) => {
    // First validate the integration settings
    if (!validateForm('integration')) {
      setNotification({
        open: true,
        message: 'Please correct the errors before testing',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Determine which settings to send based on the integration type
      let testSettings;
      let testName;
      
      switch (type) {
        case 'slack':
          if (!integrationSettings.slackEnabled) {
            throw new Error('Slack integration is disabled');
          }
          testSettings = {
            slackWebhookUrl: integrationSettings.slackWebhookUrl,
            slackChannel: integrationSettings.slackChannel
          };
          testName = 'Slack';
          break;
        case 'teams':
          if (!integrationSettings.teamsEnabled) {
            throw new Error('Microsoft Teams integration is disabled');
          }
          testSettings = {
            teamsWebhookUrl: integrationSettings.teamsWebhookUrl
          };
          testName = 'Microsoft Teams';
          break;
        case 'jira':
          if (!integrationSettings.jiraEnabled) {
            throw new Error('Jira integration is disabled');
          }
          testSettings = {
            jiraUrl: integrationSettings.jiraUrl,
            jiraUsername: integrationSettings.jiraUsername,
            jiraApiToken: integrationSettings.jiraApiToken,
            jiraProject: integrationSettings.jiraProject
          };
          testName = 'Jira';
          break;
        case 'github':
          if (!integrationSettings.githubEnabled) {
            throw new Error('GitHub integration is disabled');
          }
          testSettings = {
            githubAccessToken: integrationSettings.githubAccessToken,
            githubRepository: integrationSettings.githubRepository
          };
          testName = 'GitHub';
          break;
        default:
          throw new Error('Unknown integration type');
      }
      
      // Use the actual API call instead of mock data
      try {
        const result = await settingsService.testIntegrationConnection(type, testSettings);
        
        setNotification({
          open: true,
          message: result.message || `Connection to ${testName} tested successfully`,
          type: result.success ? 'success' : 'error',
        });
      } catch (error) {
        console.error(`Error testing ${type} integration:`, error);
        setNotification({
          open: true,
          message: error instanceof Error ? error.message : `Failed to test ${type} integration`,
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error(`Error testing ${type} integration:`, error);
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : `Failed to test ${type} integration`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch ticket priorities
  const fetchTicketPriorities = async () => {
    try {
      setLoadingPriorities(true);
      const priorities = await ticketPriorityService.getPriorities();
      
      // We should have an array of priorities at this point thanks to the fixed service
      if (Array.isArray(priorities)) {
        setPriorities(priorities);
      } else {
        console.error('Still receiving unexpected data structure for ticket priorities:', priorities);
        setPriorities([]);
      }
    } catch (error) {
      console.error('Error fetching ticket priorities:', error);
      setPriorities([]); // Set to empty array on catch
      setNotification({
        open: true,
        message: 'Failed to load ticket priorities',
        type: 'error'
      });
    } finally {
      setLoadingPriorities(false);
    }
  };
  
  // New function to fetch SLA policies
  const fetchSLAPolicies = async () => {
    try {
      setLoadingSlaPolicies(true);
      setSlaError(null);
      
      // Always use the default organization ID of 1001 since we have existing SLA policies for this org
      console.log('Using organization ID for SLA policies:', defaultOrgId);
      
      // First try to get policies from the settings table
      let policies: SLAPolicy[] = [];
      try {
        const slaSettings = await settingsService.getSLASettings();
        console.log('SLA settings from database:', slaSettings);
        
        // Check different possible response formats
        if (slaSettings) {
          if (slaSettings.policies && Array.isArray(slaSettings.policies) && slaSettings.policies.length > 0) {
            console.log(`Found ${slaSettings.policies.length} policies in settings table`);
            policies = slaSettings.policies;
          } else if (Array.isArray(slaSettings) && slaSettings.length > 0) {
            console.log(`Found ${slaSettings.length} policies in settings table (array format)`);
            policies = slaSettings;
          } else if (slaSettings.data && Array.isArray(slaSettings.data.policies) && slaSettings.data.policies.length > 0) {
            console.log(`Found ${slaSettings.data.policies.length} policies in settings table (data.policies format)`);
            policies = slaSettings.data.policies;
          }
        }
      } catch (error) {
        console.error('Error getting policies from settings table:', error);
      }
      
      // If we found policies in the settings table, use those
      if (policies.length > 0) {
        console.log('Using policies from settings table:', policies);
      setSlaPolicies(policies);
      } else {
        // Fallback to the SLA service if needed
        console.log('No policies found in settings table, fetching from SLA service');
        try {
          const fetchedPolicies = await slaService.getSLAPolicies(defaultOrgId);
          
          if (fetchedPolicies && Array.isArray(fetchedPolicies) && fetchedPolicies.length > 0) {
            console.log(`Got ${fetchedPolicies.length} policies from SLA service`, fetchedPolicies);
            setSlaPolicies(fetchedPolicies);
            // Also sync to settings table for future use
            await syncSLAPoliciesToSettings();
          } else {
            console.log('No SLA policies found in both sources');
            setSlaPolicies([]);
          }
        } catch (error) {
          console.error('Error fetching SLA policies from SLA service:', error);
          setSlaError('Failed to load SLA policies');
        }
      }
    } catch (error) {
      console.error('Error in fetchSLAPolicies:', error);
      setSlaError('Failed to load SLA policies');
    } finally {
      setLoadingSlaPolicies(false);
    }
  };
  
  // New function to handle SLA form changes
  const handleSLAFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSlaForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
    }));
  };
  
  // Function to handle SLA priority selection
  const handleSLAPriorityChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const priorityId = Number(e.target.value);
    
    if (isNaN(priorityId) || priorityId <= 0) {
      console.warn('Invalid priority ID selected:', e.target.value);
      return;
    }
    
    // Find existing SLA policy for this priority
    const existingPolicy = slaPolicies.find(policy => policy.ticketPriorityId === priorityId);
    
    if (existingPolicy) {
      console.log('Found existing SLA policy for priority:', existingPolicy);
      setSlaForm({
        priorityId,
        firstResponseHours: existingPolicy.firstResponseHours,
        nextResponseHours: existingPolicy.nextResponseHours || 0,
        resolutionHours: existingPolicy.resolutionHours,
        businessHoursOnly: existingPolicy.businessHoursOnly,
        isNew: false // Not a new policy
      });
    } else {
      // Find priority to get default values based on priority's SLA hours
      const priority = priorities.find(p => p.id === priorityId);
      const defaultSlaHours = priority?.slaHours || 24;
      
      // Set reasonable defaults based on priority SLA hours
      setSlaForm({
        priorityId,
        firstResponseHours: Math.max(1, Math.floor(defaultSlaHours / 4)),
        nextResponseHours: Math.max(2, Math.floor(defaultSlaHours / 2)),
        resolutionHours: defaultSlaHours,
        businessHoursOnly: true,
        isNew: true // This is a new policy
      });
    }
  };
  
  // Function to save SLA policy
  const handleSaveSLAPolicy = async () => {
    if (!slaForm.priorityId || !slaForm.firstResponseHours || !slaForm.resolutionHours) {
      setSlaError('Please fill in all required fields');
      return;
    }
    
    setSavingSlaPolicies(true);
    setSlaError(null);
    
    try {
      // Find priority to update slaHours
      const priority = priorities.find(p => p.id === slaForm.priorityId);
      if (!priority) {
        throw new Error('Selected priority not found');
      }
      
      console.log(`Creating/updating SLA policy for priority: ${priority.name} (ID: ${priority.id})`);
      console.log(`Using organization ID: ${defaultOrgId}`);
      
      // Find if policy already exists
      const existingPolicy = slaPolicies.find(policy => policy.ticketPriorityId === slaForm.priorityId);
      
      const policyData = {
        name: `${priority.name} Priority SLA`,
        description: `SLA policy for ${priority.name} priority tickets`,
        organizationId: defaultOrgId, // Always use the default org ID for consistency
        ticketPriorityId: slaForm.priorityId,
        firstResponseHours: slaForm.firstResponseHours,
        nextResponseHours: slaForm.nextResponseHours,
        resolutionHours: slaForm.resolutionHours,
        businessHoursOnly: slaForm.businessHoursOnly
      };
      
      console.log('SLA policy data to be saved:', policyData);
      
      let savedPolicy;
      
      if (existingPolicy) {
        // Update existing policy
        console.log(`Updating existing SLA policy with ID: ${existingPolicy.id}`);
        savedPolicy = await slaService.updateSLAPolicy(existingPolicy.id, policyData);
        
        console.log('SLA policy saved successfully:', savedPolicy ? savedPolicy : 'No response data returned');
        
        // Update state with null-safe approach - completely avoid using savedPolicy in the map function
        setSlaPolicies(prevPolicies => {
          return prevPolicies.map(policy => {
            if (policy.id === existingPolicy.id) {
              // If we have savedPolicy use it, otherwise merge policyData with existing policy
              return savedPolicy || { ...policy, ...policyData };
            }
            return policy;
          });
        });
      } else {
        // Create new policy
        console.log('Creating new SLA policy');
        savedPolicy = await slaService.createSLAPolicy(policyData);
        
        console.log('SLA policy saved successfully:', savedPolicy ? savedPolicy : 'No response data returned');
        
        // Add to local state with null check
        if (savedPolicy) {
          setSlaPolicies(prevPolicies => [...prevPolicies, savedPolicy]);
        } else {
          setNotification({
            open: true,
            message: 'Policy saved but not reflected in UI. Please refresh.',
            type: 'warning'
          });
        }
      }
      
      // Update the SLA hours in the priority - Only if we have valid data
      if (priority && priority.id) {
        console.log(`Updating priority ${priority.id} with SLA hours: ${slaForm.resolutionHours}`);
      await ticketPriorityService.updatePriority(priority.id, {
        ...priority,
        slaHours: slaForm.resolutionHours
      });
      
      // Refresh priorities
      await fetchTicketPriorities();
      } else {
        console.warn('Cannot update priority: Invalid priority data');
      }
      
      // Sync the updated SLA policies to the settings table
      await syncSLAPoliciesToSettings();
      
      setNotification({
        open: true,
        message: 'SLA policy saved successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error saving SLA policy:', err);
      setSlaError('Failed to save SLA policy. Please try again.');
      setNotification({
        open: true,
        message: 'Failed to save SLA policy',
        type: 'error'
      });
    } finally {
      setSavingSlaPolicies(false);
    }
  };

  // Replace the renderSLASaveText function
  const renderSLASaveText = () => {
    if (!ticketSettings.enableSLA) {
      return (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Enable SLA Tracking to configure SLA policies by priority
        </Typography>
      );
    }
    
    if (slaPolicies.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          No SLA policies configured. Select a priority above to create an SLA policy.
        </Typography>
      );
    }
    
    return (
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        SLA settings will be saved when you click "Save Ticket Settings"
      </Typography>
    );
  };

  // Add a function to display existing SLA policies in a table
  const renderSLAPoliciesTable = () => {
    if (!ticketSettings.enableSLA || slaPolicies.length === 0) {
      return null;
    }
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Existing SLA Policies
        </Typography>
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                <TableCell>Priority</TableCell>
                <TableCell align="center">First Response</TableCell>
                <TableCell align="center">Next Response</TableCell>
                <TableCell align="center">Resolution</TableCell>
                <TableCell align="center">Business Hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slaPolicies.map((policy) => {
                // Find the priority name
                const priority = priorities.find(p => p.id === policy.ticketPriorityId);
                return (
                  <TableRow 
                    key={policy.id} 
                    hover
                    onClick={() => {
                      setSlaForm({
                        priorityId: policy.ticketPriorityId,
                        firstResponseHours: policy.firstResponseHours,
                        nextResponseHours: policy.nextResponseHours || 0,
                        resolutionHours: policy.resolutionHours,
                        businessHoursOnly: policy.businessHoursOnly,
                        isNew: false
                      });
                    }}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05)
                      },
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1)
                      }
                    }}
                    selected={slaForm.priorityId === policy.ticketPriorityId}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            backgroundColor: priority?.color || '#ccc',
                            mr: 1
                          }} 
                        />
                        {priority?.name || 'Unknown'}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{policy.firstResponseHours} hours</TableCell>
                    <TableCell align="center">{policy.nextResponseHours || '-'} {policy.nextResponseHours ? 'hours' : ''}</TableCell>
                    <TableCell align="center">{policy.resolutionHours} hours</TableCell>
                    <TableCell align="center">
                      {policy.businessHoursOnly ? (
                        <CheckIcon color="success" fontSize="small" />
                      ) : (
                        <CloseIcon color="error" fontSize="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Initialize tabs properly after initial render
  useEffect(() => {
    // Short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (tabsRef.current) {
        // Force a small reflow to help MUI properly identify tab elements
        tabsRef.current.style.visibility = 'hidden';
        setTimeout(() => {
          if (tabsRef.current) {
            tabsRef.current.style.visibility = 'visible';
          }
        }, 50);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Add a specific handler for toggling SLA that updates and saves immediately
  const handleSLAEnableToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = event.target.checked;
    
    // First update the local state
    setTicketSettings(prev => ({
      ...prev,
      enableSLA: isEnabled
    }));
    
    setLoading(true);
    
    try {
      // Use functional updates to ensure we're using the latest state
      const updatedSettings = {
        ...ticketSettings,
        enableSLA: isEnabled
      };
      
      // Save the ticket settings to the database immediately
      console.log(`Saving SLA enabled state: ${isEnabled}`, updatedSettings);
      const result = await settingsService.updateTicketSettings(updatedSettings);
      
      // Update local state with the server response
      setTicketSettings(result);
      setOriginalTicketSettings(result);
      
      // If enabling SLA, also update the SLA policies in settings table
      if (isEnabled) {
        await syncSLAPoliciesToSettings();
      }
      
      setNotification({
        open: true,
        message: `SLA Tracking ${isEnabled ? 'enabled' : 'disabled'} successfully`,
        type: 'success',
      });
      
      // If SLA is being enabled, make sure we have policies
      if (isEnabled) {
        fetchSLAPolicies();
      }
    } catch (error) {
      console.error('Error saving SLA enabled state:', error);
      // Revert the local state change on error
      setTicketSettings(prev => ({
        ...prev,
        enableSLA: !isEnabled
      }));
      
      setNotification({
        open: true,
        message: 'Failed to update SLA settings',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth={false} sx={{ 
      py: { xs: 2, md: 3 },
      position: 'relative',
      width: '100%',
      px: { xs: 2, sm: 3, md: 4 },
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
      },
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
    }}>
      <Grid container spacing={1}>
        {/* Header - Exact match to Ticket Management header */}
        <Grid item xs={12}>
          <Card 
            elevation={0}
            sx={{ 
              p: 0, 
              overflow: 'hidden',
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.2),
              borderRadius: 3,
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(120deg, ${alpha(theme.palette.primary.dark, 0.7)}, ${alpha(theme.palette.secondary.dark, 0.5)})`
                : `linear-gradient(120deg, ${alpha('#fff', 0.95)}, ${alpha(theme.palette.secondary.light, 0.15)})`,
              position: 'relative',
            }}
          >
            <Box sx={{ p: { xs: 3, md: 2 }, position: 'relative', zIndex: 1 }}>
              <Grid container alignItems="center" justifyContent="space-between" spacing={3}>
                <Grid item xs={12} md={7}>
                  <Typography variant="h5" component="h1" gutterBottom>
                    System Settings
                  </Typography>
                  <Typography variant="subtitle1">
                    Configure your service desk settings and customize the system to match your organization's needs.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefreshData}
                  >
                    Refresh Settings
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12}>
          {apiError && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
                display: 'flex',
                alignItems: 'center'
              }}
              action={
                <Button color="error" size="small" onClick={() => fetchAllSettings()}>
                  Retry
                </Button>
              }
            >
              {apiError}
            </Alert>
          )}
          
          {unsavedChanges && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
              }}
            >
              You have unsaved changes. Please save before leaving this page.
            </Alert>
          )}

          <Paper 
            sx={{ 
              width: '100%',
              borderRadius: 3,
              mb: 3,
              overflow: 'hidden'
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }} ref={tabsRef}>
              <Tabs 
                value={value}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                aria-label="settings tabs"
                sx={{
                  px: { xs: 1, sm: 2 },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0'
                  }
                }}
              >
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SettingsIcon fontSize="small" />
                      {value === 0 && <span>General Settings</span>}
                      {value !== 0 && <span>General</span>}
                    </Box>
                  }
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon fontSize="small" />
                      {value === 1 && <span>Email Settings</span>}
                      {value !== 1 && <span>Email</span>}
                    </Box>
                  }
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TicketIcon fontSize="small" />
                      {value === 2 && <span>Ticket Settings</span>}
                      {value !== 2 && <span>Tickets</span>}
                    </Box>
                  }
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ClockIcon fontSize="small" />
                      {value === 3 && <span>SLA Settings</span>}
                      {value !== 3 && <span>SLA</span>}
                    </Box>
                  }
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IntegrationsIcon fontSize="small" />
                      {value === 4 && <span>Integrations</span>}
                      {value !== 4 && <span>Integrations</span>}
                    </Box>
                  }
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AdvancedIcon fontSize="small" />
                      {value === 5 && <span>Advanced Settings</span>}
                      {value !== 5 && <span>Advanced</span>}
                    </Box>
                  }
                />
              </Tabs>
            </Box>
            
            {/* General Settings */}
              <TabPanel value={value} index={0}>
              <EnhancedGrid container spacing={1}>
                  <Grid item xs={12} md={6}>
                  <EnhancedCard
                    index={2}
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 0,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      overflow: 'hidden',
                      ...gradientAccent(theme)
                    }}>
                    <CardHeader
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 0.5
                        }}>
                          General Configuration
                        </Typography>
                      }
                      action={
                        loadingSettings.general ? (
                          <CircularProgress size={24} />
                        ) : (
                          <Tooltip title="Configure basic system settings">
                            <IconButton>
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                      sx={{
                        p: 3,
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3 }}>
                    {loadingSettings.general ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        <FormField
                          label="Company Name"
                          name="companyName"
                          value={generalSettings.companyName}
                          onChange={handleGeneralSettingsChange}
                          required
                          error={!!getGeneralError('companyName')}
                          helperText={getGeneralError('companyName')}
                        />
                        <FormField
                          label="Support Email"
                          name="supportEmail"
                          value={generalSettings.supportEmail}
                          onChange={handleGeneralSettingsChange}
                          required
                          error={!!getGeneralError('supportEmail')}
                          helperText={getGeneralError('supportEmail')}
                        />
                        <FormField
                          label="Max File Size (MB)"
                          name="maxFileSize"
                          value={generalSettings.maxFileSize}
                          onChange={handleGeneralSettingsChange}
                          type="number"
                          required
                          error={!!getGeneralError('maxFileSize')}
                          helperText={getGeneralError('maxFileSize')}
                        />
                        <FormControl fullWidth margin="normal">
                          <InputLabel id="default-timezone-label">Default Time Zone</InputLabel>
                          <Select
                            labelId="default-timezone-label"
                            name="defaultTimeZone"
                            value={generalSettings.defaultTimeZone}
                            onChange={(e) => handleSelectChange(e as any, 'general')}
                            label="Default Time Zone"
                          >
                            <MenuItem value="UTC">UTC</MenuItem>
                            <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                            <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                            <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                            <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={generalSettings.allowGuestTickets}
                              onChange={handleGeneralSettingsChange}
                              name="allowGuestTickets"
                              color="primary"
                            />
                          }
                          label="Allow Guest Tickets"
                          sx={{ mt: 2 }}
                        />
                      </>
                    )}
                    </CardContent>
                  </EnhancedCard>
                  </Grid>
                  <Grid item xs={12} md={6}>
                  <EnhancedCard
                    index={3}
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 0,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      overflow: 'hidden',
                      ...gradientAccent(theme)
                    }}>
                    <CardHeader
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 0.5
                        }}>
                          About These Settings
                        </Typography>
                      }
                      sx={{
                        p: 3,
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3, pt: 3 }}>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          General settings affect the overall behavior of SupportFix.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Company Name:</strong> Used throughout the portal and in emails.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Support Email:</strong> The primary contact email for support.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Max File Size:</strong> Maximum attachment size in MB.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Default Time Zone:</strong> Used for displaying dates and times.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Allow Guest Tickets:</strong> Enables ticket creation without an account.
                        </Typography>
                      </CardContent>
                    </EnhancedCard>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={() => handleSaveGeneralSettings()}
                        disabled={loading || !unsavedChanges}
                      >
                        Save General Settings
                      </Button>
                    </Box>
                  </Grid>
              </EnhancedGrid>
              </TabPanel>

            {/* Email Settings */}
              <TabPanel value={value} index={1}>
              <EnhancedGrid container spacing={1}>
                  <Grid item xs={12} md={6}>
                  <EnhancedCard
                    index={2}
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 0,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      overflow: 'hidden',
                      ...gradientAccent(theme)
                    }}>
                    <CardHeader
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 0.5
                        }}>
                          Email Configuration
                        </Typography>
                      }
                      action={
                        loadingSettings.email ? (
                          <CircularProgress size={24} />
                        ) : (
                          <Tooltip title="Configure email settings">
                            <IconButton>
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                      sx={{
                        p: 3,
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3 }}>
                    {loadingSettings.email ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                        <CircularProgress />
                      </Box>
                    ) : emailSettings ? (
                      <>
                        <FormField
                          label="SMTP Server"
                          name="smtpServer"
                          value={emailSettings.smtpServer || ''}
                          onChange={handleEmailSettingsChange}
                          required
                          error={!!getEmailError('smtpServer')}
                          helperText={getEmailError('smtpServer')}
                        />
                        <FormField
                          label="SMTP Port"
                          name="smtpPort"
                          value={emailSettings.smtpPort || 587}
                          onChange={handleEmailSettingsChange}
                          type="number"
                          required
                          error={!!getEmailError('smtpPort')}
                          helperText={getEmailError('smtpPort')}
                        />
                        <FormField
                          label="SMTP Username"
                          name="smtpUsername"
                          value={emailSettings.smtpUsername || ''}
                          onChange={handleEmailSettingsChange}
                          required
                          error={!!getEmailError('smtpUsername')}
                          helperText={getEmailError('smtpUsername')}
                        />
                        <FormField
                          label="SMTP Password"
                          name="smtpPassword"
                          value={emailSettings.smtpPassword || ''}
                          onChange={handleEmailSettingsChange}
                          type="password"
                          required
                          error={!!getEmailError('smtpPassword')}
                          helperText={getEmailError('smtpPassword')}
                        />
                        <FormField
                          label="From Name"
                          name="emailFromName"
                          value={emailSettings.emailFromName || ''}
                          onChange={handleEmailSettingsChange}
                          error={!!getEmailError('emailFromName')}
                          helperText={getEmailError('emailFromName')}
                        />
                        <FormField
                          label="Reply-To Email"
                          name="emailReplyTo"
                          value={emailSettings.emailReplyTo || ''}
                          onChange={handleEmailSettingsChange}
                          required
                          error={!!getEmailError('emailReplyTo')}
                          helperText={getEmailError('emailReplyTo')}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={emailSettings.enableEmailNotifications ?? true}
                              onChange={handleEmailSettingsChange}
                              name="enableEmailNotifications"
                              color="primary"
                            />
                          }
                          label="Enable Email Notifications"
                          sx={{ mt: 2 }}
                        />
                      </>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '300px', justifyContent: 'center' }}>
                        <Typography color="error" gutterBottom>
                          Failed to load email settings
                        </Typography>
                        <Button 
                          variant="outlined" 
                          startIcon={<RefreshIcon />}
                          onClick={fetchEmailSettings}
                          sx={{ mt: 2 }}
                        >
                          Retry
                        </Button>
                      </Box>
                    )}
                    </CardContent>
                  </EnhancedCard>
                  </Grid>
                  <Grid item xs={12} md={6}>
                  <EnhancedCard
                    index={3}
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 0,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      overflow: 'hidden',
                      ...gradientAccent(theme)
                    }}>
                    <CardHeader
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 0.5
                        }}>
                          About These Settings
                        </Typography>
                      }
                      sx={{
                        p: 3,
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          Configure the email settings to enable notification emails and ticket creation via email.
                        </Typography>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          Make sure your SMTP server details are correct and that the server allows connections from your
                          service desk IP address.
                        </Typography>
                        <Alert severity="info" sx={{ mt: 2 }}>
                          After saving, a test email will be sent to verify your configuration.
                        </Alert>
                        <Button 
                          variant="outlined" 
                          sx={{ mt: 2 }}
                          disabled={loading}
                          onClick={handleTestEmailSettings}
                          startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                        >
                          Send Test Email
                        </Button>
                    </CardContent>
                  </EnhancedCard>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={() => handleSaveEmailSettings()}
                        disabled={loading || !unsavedChanges}
                      >
                        Save Email Settings
                      </Button>
                    </Box>
                  </Grid>
              </EnhancedGrid>
              </TabPanel>

            {/* Ticket Settings */}
              <TabPanel value={value} index={2}>
              <EnhancedGrid container spacing={1}>
                  <Grid item xs={12} md={6}>
                  <EnhancedCard
                    index={2}
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 0,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      overflow: 'hidden',
                      ...gradientAccent(theme)
                    }}>
                    <CardHeader
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 0.5
                        }}>
                          Ticket Configuration
                        </Typography>
                      }
                      action={
                        loadingSettings.ticket ? (
                          <CircularProgress size={24} />
                        ) : (
                          <Tooltip title="Configure ticket settings">
                            <IconButton>
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                      sx={{
                        p: 3,
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3 }}>
                    {loadingSettings.ticket ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        <FormControl fullWidth margin="normal">
                          <InputLabel id="default-priority-label">Default Priority</InputLabel>
                          <Select
                            labelId="default-priority-label"
                            name="defaultPriority"
                            value={ticketSettings.defaultPriority}
                            onChange={(e) => handleSelectChange(e as any, 'ticket')}
                            label="Default Priority"
                          >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="urgent">Urgent</MenuItem>
                          </Select>
                        </FormControl>
                        <FormField
                          label="Days to Allow Ticket Reopening"
                          name="closedTicketReopen"
                          value={ticketSettings.closedTicketReopen}
                          onChange={handleTicketSettingsChange}
                          type="number"
                          helperText={getTicketError('closedTicketReopen') || "Number of days after closing that a ticket can be reopened"}
                          error={!!getTicketError('closedTicketReopen')}
                        />
                        <FormField
                          label="Auto-Close Resolved Tickets (days)"
                          name="autoCloseResolved"
                          value={ticketSettings.autoCloseResolved}
                          onChange={handleTicketSettingsChange}
                          type="number"
                          helperText={getTicketError('autoCloseResolved') || "Number of days before resolved tickets are automatically closed"}
                          error={!!getTicketError('autoCloseResolved')}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={ticketSettings.enableCustomerSatisfaction}
                              onChange={handleTicketSettingsChange}
                              name="enableCustomerSatisfaction"
                              color="primary"
                            />
                          }
                          label="Enable Customer Satisfaction Surveys"
                          sx={{ mt: 2, display: 'block' }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={ticketSettings.requireCategory}
                              onChange={handleTicketSettingsChange}
                              name="requireCategory"
                              color="primary"
                            />
                          }
                          label="Require Category for Tickets"
                          sx={{ mt: 1, display: 'block' }}
                        />
                      </>
                    )}
                    </CardContent>
                  </EnhancedCard>
                  </Grid>
                  <Grid item xs={12} md={6}>
                  <EnhancedCard
                    index={3}
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 0,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      overflow: 'hidden',
                      ...gradientAccent(theme)
                    }}>
                    <CardHeader
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 0.5
                        }}>
                          Ticket Options
                        </Typography>
                      }
                      action={
                        loadingSlaPolicies ? (
                          <CircularProgress size={24} />
                        ) : (
                          <Tooltip title="Additional ticket options">
                            <IconButton>
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                      sx={{
                        p: 3,
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        These settings control how tickets behave in your service desk.
                      </Typography>
                      
                      <Typography variant="body2" color="textSecondary" paragraph>
                        <strong>Default Priority:</strong> The default priority assigned to new tickets.
                      </Typography>
                      
                      <Typography variant="body2" color="textSecondary" paragraph>
                        <strong>Ticket Reopening:</strong> How long closed tickets can be reopened.
                      </Typography>
                      
                      <Typography variant="body2" color="textSecondary" paragraph>
                        <strong>Auto-Close:</strong> When resolved tickets are automatically closed.
                      </Typography>
                      
                      <Typography variant="body2" color="textSecondary">
                        <strong>SLA Tracking:</strong> Enable to track response and resolution times.
                      </Typography>
                    </CardContent>
                  </EnhancedCard>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={handleSaveTicketSettings}
                        disabled={loading || !unsavedChanges}
                      >
                        Save SLA Settings
                      </Button>
                    </Box>
                  </Grid>
              </EnhancedGrid>
              </TabPanel>

            {/* SLA Settings */}
              <TabPanel value={value} index={3}>
              <EnhancedGrid container spacing={1}>
                  <Grid item xs={12} md={6}>
                  <EnhancedCard
                    index={2}
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 0,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      overflow: 'hidden',
                      ...gradientAccent(theme)
                    }}>
                    <CardHeader
                      title={
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.2rem',
                          color: theme.palette.text.primary,
                          letterSpacing: '0.5px',
                          mb: 0.5
                        }}>
                          SLA Configuration
                        </Typography>
                      }
                      action={
                        loadingSlaPolicies ? (
                          <CircularProgress size={24} />
                        ) : (
                          <Tooltip title="Configure SLA settings by priority">
                            <IconButton>
                              <ClockIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                      sx={{
                        p: 3,
                        pb: 2,
                        background: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.background.paper, 0.4)
                          : alpha(theme.palette.background.paper, 0.7),
                      }}
                    />
                    <Divider />
                    <CardContent sx={{ p: 3 }}>
                      {loadingSlaPolicies || loadingPriorities ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <>
                          {slaError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                              {slaError}
                            </Alert>
                          )}
                          
                          <FormControlLabel
                            control={
                              <Switch
                                checked={ticketSettings.enableSLA || false}
                                onChange={handleSLAEnableToggle}
                                name="enableSLA"
                                color="primary"
                              />
                            }
                            label="Enable SLA Tracking"
                            sx={{ mb: 2, display: 'block' }}
                          />
                          
                          <Box sx={{ opacity: ticketSettings.enableSLA ? 1 : 0.5, pointerEvents: ticketSettings.enableSLA ? 'auto' : 'none' }}>
                            <FormControl fullWidth margin="normal">
                              <InputLabel id="sla-priority-label">Ticket Priority</InputLabel>
                              <Select
                                labelId="sla-priority-label"
                                name="priorityId"
                                value={slaForm.priorityId || ''}
                                onChange={handleSLAPriorityChange as any}
                                label="Ticket Priority"
                                disabled={!ticketSettings.enableSLA || savingSlaPolicies}
                              >
                                <MenuItem value={0} disabled>Select a priority</MenuItem>
                                {priorities.map((priority) => (
                                  <MenuItem key={priority.id} value={priority.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box 
                                        sx={{ 
                                          width: 10, 
                                          height: 10, 
                                          borderRadius: '50%', 
                                          backgroundColor: priority.color,
                                          mr: 1
                                        }} 
                                      />
                                      {priority.name}
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            
                            <TextField
                              margin="normal"
                              name="firstResponseHours"
                              label="First Response (hours)"
                              type="number"
                              fullWidth
                              value={slaForm.firstResponseHours || ''}
                              onChange={handleSLAFormChange}
                              disabled={!ticketSettings.enableSLA || !slaForm.priorityId || savingSlaPolicies}
                              InputProps={{ inputProps: { min: 1 } }}
                              helperText="Time to first respond to the ticket"
                            />
                            
                            <TextField
                              margin="normal"
                              name="nextResponseHours"
                              label="Next Response (hours)"
                              type="number"
                              fullWidth
                              value={slaForm.nextResponseHours || ''}
                              onChange={handleSLAFormChange}
                              disabled={!ticketSettings.enableSLA || !slaForm.priorityId || savingSlaPolicies}
                              InputProps={{ inputProps: { min: 1 } }}
                              helperText="Time for subsequent responses"
                            />
                            
                            <TextField
                              margin="normal"
                              name="resolutionHours"
                              label="Resolution Time (hours)"
                              type="number"
                              fullWidth
                              value={slaForm.resolutionHours || ''}
                              onChange={handleSLAFormChange}
                              disabled={!ticketSettings.enableSLA || !slaForm.priorityId || savingSlaPolicies}
                              InputProps={{ inputProps: { min: 1 } }}
                              helperText="Time to resolve the ticket (also updates SLA hours)"
                            />
                            
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={slaForm.businessHoursOnly}
                                  onChange={handleSLAFormChange}
                                  name="businessHoursOnly"
                                  color="primary"
                                  disabled={!ticketSettings.enableSLA || !slaForm.priorityId || savingSlaPolicies}
                                />
                              }
                              label="Business Hours Only"
                              sx={{ mt: 2, display: 'block' }}
                            />
                            
                            {/* Add direct save button for SLA policy */}
                            <Box sx={{ mt: 2, mb: 2 }}>
                              <Button
                                variant="contained"
                                color="primary"
                                startIcon={savingSlaPolicies ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                onClick={handleSaveSLAPolicy}
                                disabled={savingSlaPolicies || !ticketSettings.enableSLA || !slaForm.priorityId}
                                fullWidth
                              >
                                Save SLA Policy
                              </Button>
                            </Box>
                            
                            {renderSLASaveText()}
                            
                            {renderSLAPoliciesTable()}
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </EnhancedCard>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={handleSaveTicketSettings}
                        disabled={loading || !unsavedChanges}
                      >
                        Save SLA Settings
                      </Button>
                    </Box>
                  </Grid>
              </EnhancedGrid>
              </TabPanel>

            {/* Integrations Settings */}
              <TabPanel value={value} index={4}>
              <EnhancedGrid container spacing={1}>
                {loadingSettings.integration ? (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                      <CircularProgress />
                    </Box>
                  </Grid>
                ) : (
                  <>
                    {/* Slack Integration */}
                    <Grid item xs={12} md={6}>
                      <EnhancedCard
                        index={2}
                        elevation={0}
                        sx={{
                          height: '100%',
                          p: 0,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          overflow: 'hidden',
                          ...gradientAccent(theme)
                        }}>
                        <CardHeader
                          title={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <SlackIcon sx={{ mr: 1.5, color: '#4A154B' }} />
                              <Typography variant="h6" sx={{ 
                                fontWeight: 700, 
                                fontSize: '1.2rem',
                                color: theme.palette.text.primary,
                                letterSpacing: '0.5px',
                                mb: 0
                              }}>
                                Slack Integration
                              </Typography>
                            </Box>
                          }
                          action={
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={integrationSettings.slackEnabled}
                                  onChange={handleIntegrationSettingsChange}
                                  name="slackEnabled"
                                  color="primary"
                                />
                              }
                              label="Enabled"
                              sx={{ mr: 0 }}
                            />
                          }
                          sx={{
                            p: 3,
                            pb: 2,
                            background: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.background.paper, 0.4)
                              : alpha(theme.palette.background.paper, 0.7),
                          }}
                        />
                        <Divider />
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            Integrate with Slack to send notifications about tickets and updates.
                          </Typography>
                          
                          <Box sx={{ opacity: integrationSettings.slackEnabled ? 1 : 0.5, pointerEvents: integrationSettings.slackEnabled ? 'auto' : 'none' }}>
                            <FormField
                              label="Webhook URL"
                              name="slackWebhookUrl"
                              value={integrationSettings.slackWebhookUrl}
                              onChange={handleIntegrationSettingsChange}
                              required
                              disabled={!integrationSettings.slackEnabled}
                              error={!!getIntegrationError('slackWebhookUrl')}
                              helperText={getIntegrationError('slackWebhookUrl')}
                            />
                            
                            <FormField
                              label="Channel"
                              name="slackChannel"
                              value={integrationSettings.slackChannel}
                              onChange={handleIntegrationSettingsChange}
                              required
                              disabled={!integrationSettings.slackEnabled}
                              error={!!getIntegrationError('slackChannel')}
                              helperText={getIntegrationError('slackChannel') || 'Channel name (e.g. #support)'}
                            />
                            
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={integrationSettings.slackNotifyOnNewTicket}
                                  onChange={handleIntegrationSettingsChange}
                                  name="slackNotifyOnNewTicket"
                                  color="primary"
                                  disabled={!integrationSettings.slackEnabled}
                                />
                              }
                              label="Notify on new tickets"
                              sx={{ mt: 2, display: 'block' }}
                            />
                            
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={integrationSettings.slackNotifyOnTicketUpdates}
                                  onChange={handleIntegrationSettingsChange}
                                  name="slackNotifyOnTicketUpdates"
                                  color="primary"
                                  disabled={!integrationSettings.slackEnabled}
                                />
                              }
                              label="Notify on ticket updates"
                              sx={{ mt: 1, display: 'block' }}
                            />
                            
                            <Button
                              variant="outlined"
                              color="primary"
                              disabled={!integrationSettings.slackEnabled || loading}
                              onClick={() => handleTestIntegration('slack')}
                              startIcon={loading ? <CircularProgress size={20} /> : <SlackIcon />}
                              sx={{ mt: 2 }}
                            >
                              Test Slack Connection
                            </Button>
                          </Box>
                        </CardContent>
                      </EnhancedCard>
                    </Grid>
                    
                    {/* Jira Integration */}
                    <Grid item xs={12} md={6}>
                      <EnhancedCard
                        index={4}
                        elevation={0}
                        sx={{
                          height: '100%',
                          p: 0,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          overflow: 'hidden',
                          ...gradientAccent(theme)
                        }}>
                        <CardHeader
                          title={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <JiraIcon sx={{ mr: 1.5, color: '#0052CC' }} />
                              <Typography variant="h6" sx={{ 
                                fontWeight: 700, 
                                fontSize: '1.2rem',
                                color: theme.palette.text.primary,
                                letterSpacing: '0.5px',
                                mb: 0
                              }}>
                                Jira Integration
                              </Typography>
                            </Box>
                          }
                          action={
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={integrationSettings.jiraEnabled}
                                  onChange={handleIntegrationSettingsChange}
                                  name="jiraEnabled"
                                  color="primary"
                                />
                              }
                              label="Enabled"
                              sx={{ mr: 0 }}
                            />
                          }
                          sx={{
                            p: 3,
                            pb: 2,
                            background: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.background.paper, 0.4)
                              : alpha(theme.palette.background.paper, 0.7),
                          }}
                        />
                        <Divider />
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            Integrate with Jira to sync tickets and issues between systems.
                          </Typography>
                          
                          <Box sx={{ opacity: integrationSettings.jiraEnabled ? 1 : 0.5, pointerEvents: integrationSettings.jiraEnabled ? 'auto' : 'none' }}>
                            <FormField
                              label="Jira URL"
                              name="jiraUrl"
                              value={integrationSettings.jiraUrl}
                              onChange={handleIntegrationSettingsChange}
                              required
                              disabled={!integrationSettings.jiraEnabled}
                              error={!!getIntegrationError('jiraUrl')}
                              helperText={getIntegrationError('jiraUrl') || 'Your Jira instance URL (e.g., https://acme.atlassian.net)'}
                            />
                            <FormField
                              label="Username"
                              name="jiraUsername"
                              value={integrationSettings.jiraUsername}
                              onChange={handleIntegrationSettingsChange}
                              required
                              disabled={!integrationSettings.jiraEnabled}
                              error={!!getIntegrationError('jiraUsername')}
                              helperText={getIntegrationError('jiraUsername')}
                            />
                            <FormField
                              label="API Token"
                              name="jiraApiToken"
                              value={integrationSettings.jiraApiToken}
                              onChange={handleIntegrationSettingsChange}
                              type="password"
                              required
                              disabled={!integrationSettings.jiraEnabled}
                              error={!!getIntegrationError('jiraApiToken')}
                              helperText={getIntegrationError('jiraApiToken')}
                            />
                            <FormField
                              label="Project Key"
                              name="jiraProject"
                              value={integrationSettings.jiraProject}
                              onChange={handleIntegrationSettingsChange}
                              required
                              disabled={!integrationSettings.jiraEnabled}
                              error={!!getIntegrationError('jiraProject')}
                              helperText={getIntegrationError('jiraProject')}
                            />
                            
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={integrationSettings.jiraCreateIssuesForTickets}
                                  onChange={handleIntegrationSettingsChange}
                                  name="jiraCreateIssuesForTickets"
                                  color="primary"
                                  disabled={!integrationSettings.jiraEnabled}
                                />
                              }
                              label="Create Jira issues for new tickets"
                              sx={{ mt: 2, display: 'block' }}
                            />
                            
                            <Button
                              variant="outlined"
                              color="primary"
                              disabled={!integrationSettings.jiraEnabled || loading}
                              onClick={() => handleTestIntegration('jira')}
                              startIcon={loading ? <CircularProgress size={20} /> : <JiraIcon />}
                              sx={{ mt: 2 }}
                            >
                              Test Jira Connection
                            </Button>
                          </Box>
                        </CardContent>
                      </EnhancedCard>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                          onClick={() => handleSaveIntegrationSettings()}
                          disabled={loading || !unsavedChanges}
                        >
                          Save Integration Settings
                        </Button>
                      </Box>
                    </Grid>
                  </>
                )}
              </EnhancedGrid>
              </TabPanel>

            {/* Advanced Settings */}
              <TabPanel value={value} index={5}>
              <EnhancedGrid container spacing={1}>
                {loadingSettings.advanced ? (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                      <CircularProgress />
                    </Box>
                  </Grid>
                ) : (
                  <>
                    {/* API Settings */}
                    <Grid item xs={12} md={6}>
                      <EnhancedCard
                        index={2}
                        elevation={0}
                        sx={{
                          height: '100%',
                          p: 0,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          overflow: 'hidden',
                          ...gradientAccent(theme)
                        }}>
                        <CardHeader
                          title={
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              fontSize: '1.2rem',
                              color: theme.palette.text.primary,
                              letterSpacing: '0.5px',
                              mb: 0.5
                            }}>
                              API Settings
                            </Typography>
                          }
                          sx={{
                            p: 3,
                            pb: 2,
                            background: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.background.paper, 0.4)
                              : alpha(theme.palette.background.paper, 0.7),
                          }}
                        />
                        <Divider />
                        <CardContent sx={{ p: 3 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={advancedSettings.apiEnabled}
                                onChange={handleAdvancedSettingsChange}
                                name="apiEnabled"
                                color="primary"
                              />
                            }
                            label="Enable API Access"
                            sx={{ mb: 2, display: 'block' }}
                          />
                          
                          <Box sx={{ opacity: advancedSettings.apiEnabled ? 1 : 0.5, pointerEvents: advancedSettings.apiEnabled ? 'auto' : 'none' }}>
                            <FormField
                              label="API Rate Limit (requests/hour)"
                              name="apiRateLimitPerHour"
                              value={advancedSettings.apiRateLimitPerHour}
                              onChange={handleAdvancedSettingsChange}
                              type="number"
                              disabled={!advancedSettings.apiEnabled}
                              error={!!getAdvancedError('apiRateLimitPerHour')}
                              helperText={getAdvancedError('apiRateLimitPerHour')}
                            />
                            
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={advancedSettings.enableApiDocumentation}
                                  onChange={handleAdvancedSettingsChange}
                                  name="enableApiDocumentation"
                                  color="primary"
                                  disabled={!advancedSettings.apiEnabled}
                                />
                              }
                              label="Enable API Documentation"
                              sx={{ mt: 2, display: 'block' }}
                            />
                            
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                              API Base URL: <code>{window.location.origin}/api/v1</code>
                            </Typography>
                            
                            <Button
                              variant="outlined"
                              color="primary"
                              disabled={!advancedSettings.apiEnabled}
                              sx={{ mt: 2 }}
                              component={Link}
                              href={advancedSettings.enableApiDocumentation ? `${window.location.origin}/api-docs` : '#'}
                              target="_blank"
                              startIcon={<LinkIcon />}
                            >
                              View API Documentation
                            </Button>
                          </Box>
                        </CardContent>
                      </EnhancedCard>
                    </Grid>
                    
                    {/* Security Settings */}
                    <Grid item xs={12} md={6}>
                      <EnhancedCard
                        index={3}
                        elevation={0}
                        sx={{
                          height: '100%',
                          p: 0,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          overflow: 'hidden',
                          ...gradientAccent(theme)
                        }}>
                        <CardHeader
                          title={
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              fontSize: '1.2rem',
                              color: theme.palette.text.primary,
                              letterSpacing: '0.5px',
                              mb: 0.5
                            }}>
                              Security Settings
                            </Typography>
                          }
                          sx={{
                            p: 3,
                            pb: 2,
                            background: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.background.paper, 0.4)
                              : alpha(theme.palette.background.paper, 0.7),
                          }}
                        />
                        <Divider />
                        <CardContent sx={{ p: 3 }}>
                          <FormField
                            label="Max Login Attempts"
                            name="maxLoginAttempts"
                            value={advancedSettings.maxLoginAttempts}
                            onChange={handleAdvancedSettingsChange}
                            type="number"
                            error={!!getAdvancedError('maxLoginAttempts')}
                            helperText={getAdvancedError('maxLoginAttempts') || 'Number of login attempts before account lockout'}
                          />
                          
                          <FormField
                            label="Password Expiry (days)"
                            name="passwordExpiryDays"
                            value={advancedSettings.passwordExpiryDays}
                            onChange={handleAdvancedSettingsChange}
                            type="number"
                            error={!!getAdvancedError('passwordExpiryDays')}
                            helperText={getAdvancedError('passwordExpiryDays') || 'Days before password expires (0 = never)'}
                          />
                          
                          <FormField
                            label="Session Timeout (minutes)"
                            name="sessionTimeoutMinutes"
                            value={advancedSettings.sessionTimeoutMinutes}
                            onChange={handleAdvancedSettingsChange}
                            type="number"
                            error={!!getAdvancedError('sessionTimeoutMinutes')}
                            helperText={getAdvancedError('sessionTimeoutMinutes') || 'Inactive session timeout in minutes'}
                          />
                          
                          <FormControlLabel
                            control={
                              <Switch
                                checked={advancedSettings.enforceMfa}
                                onChange={handleAdvancedSettingsChange}
                                name="enforceMfa"
                                color="primary"
                              />
                            }
                            label="Enforce Multi-Factor Authentication"
                            sx={{ mt: 2, display: 'block' }}
                          />
                        </CardContent>
                      </EnhancedCard>
                    </Grid>
                    
                    {/* Performance and AI Settings */}
                    <Grid item xs={12} md={6}>
                      <EnhancedCard
                        index={4}
                        elevation={0}
                        sx={{
                          height: '100%',
                          p: 0,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          overflow: 'hidden',
                          ...gradientAccent(theme)
                        }}>
                        <CardHeader
                          title={
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              fontSize: '1.2rem',
                              color: theme.palette.text.primary,
                              letterSpacing: '0.5px',
                              mb: 0.5
                            }}>
                              Performance Settings
                            </Typography>
                          }
                          sx={{
                            p: 3,
                            pb: 2,
                            background: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.background.paper, 0.4)
                              : alpha(theme.palette.background.paper, 0.7),
                          }}
                        />
                        <Divider />
                        <CardContent sx={{ p: 3 }}>
                          <FormField
                            label="Cache Duration (minutes)"
                            name="cacheDurationMinutes"
                            value={advancedSettings.cacheDurationMinutes}
                            onChange={handleAdvancedSettingsChange}
                            type="number"
                            error={!!getAdvancedError('cacheDurationMinutes')}
                            helperText={getAdvancedError('cacheDurationMinutes') || 'Duration to cache API responses (0 = disabled)'}
                          />
                          
                          <FormField
                            label="Max Concurrent Uploads"
                            name="maxConcurrentFileUploads"
                            value={advancedSettings.maxConcurrentFileUploads}
                            onChange={handleAdvancedSettingsChange}
                            type="number"
                            error={!!getAdvancedError('maxConcurrentFileUploads')}
                            helperText={getAdvancedError('maxConcurrentFileUploads')}
                          />
                        </CardContent>
                      </EnhancedCard>
                    </Grid>
                    
                    {/* AI Features */}
                    <Grid item xs={12} md={6}>
                      <EnhancedCard
                        index={5}
                        elevation={0}
                        sx={{
                          height: '100%',
                          p: 0,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          overflow: 'hidden',
                          ...gradientAccent(theme)
                        }}>
                        <CardHeader
                          title={
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              fontSize: '1.2rem',
                              color: theme.palette.text.primary,
                              letterSpacing: '0.5px',
                              mb: 0.5
                            }}>
                              AI Features
                            </Typography>
                          }
                          sx={{
                            p: 3,
                            pb: 2,
                            background: theme.palette.mode === 'dark' 
                              ? alpha(theme.palette.background.paper, 0.4)
                              : alpha(theme.palette.background.paper, 0.7),
                          }}
                        />
                        <Divider />
                        <CardContent sx={{ p: 3 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={advancedSettings.enableAiSuggestions}
                                onChange={handleAdvancedSettingsChange}
                                name="enableAiSuggestions"
                                color="primary"
                              />
                            }
                            label="Enable AI-Powered Suggestions"
                            sx={{ mb: 2, display: 'block' }}
                          />
                          
                          <FormControlLabel
                            control={
                              <Switch
                                checked={advancedSettings.enableAutoTagging}
                                onChange={handleAdvancedSettingsChange}
                                name="enableAutoTagging"
                                color="primary"
                              />
                            }
                            label="Enable Automatic Ticket Tagging"
                            sx={{ mb: 2, display: 'block' }}
                          />
                          
                          <FormControlLabel
                            control={
                              <Switch
                                checked={advancedSettings.enableSentimentAnalysis}
                                onChange={handleAdvancedSettingsChange}
                                name="enableSentimentAnalysis"
                                color="primary"
                              />
                            }
                            label="Enable Sentiment Analysis"
                            sx={{ mb: 2, display: 'block' }}
                          />
                          
                          <FormControl fullWidth margin="normal">
                            <InputLabel id="ai-model-label">AI Model</InputLabel>
                            <Select
                              labelId="ai-model-label"
                              name="aiModelName"
                              value={advancedSettings.aiModelName}
                              onChange={(e) => handleAdvancedSettingsChange(e as any)}
                              label="AI Model"
                            >
                              <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                              <MenuItem value="gpt-4">GPT-4</MenuItem>
                              <MenuItem value="claude-instant">Claude Instant</MenuItem>
                              <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
                            </Select>
                          </FormControl>
                        </CardContent>
                      </EnhancedCard>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                          onClick={() => handleSaveAdvancedSettings()}
                          disabled={loading || !unsavedChanges}
                        >
                          Save Advanced Settings
                        </Button>
                      </Box>
                    </Grid>
                  </>
                )}
              </EnhancedGrid>
              </TabPanel>
          </Paper>

          {/* Unsaved changes dialog */}
          <Dialog
            open={showLeaveDialog}
            onClose={handleCancelTabChange}
            aria-labelledby="leave-dialog-title"
            aria-describedby="leave-dialog-description"
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: theme.shadows[24],
                background: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.background.paper, 0.9)
                  : theme.palette.background.paper,
              }
            }}
          >
            <DialogTitle id="leave-dialog-title">
              <Box display="flex" alignItems="center">
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                Unsaved Changes
              </Box>
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="leave-dialog-description">
                You have unsaved changes on this tab. Would you like to discard these changes and continue?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelTabChange} color="primary">
                Cancel
              </Button>
              <Button onClick={handleConfirmTabChange} color="error">
                Discard Changes
              </Button>
            </DialogActions>
          </Dialog>

          <Snackbar
            open={notification.open}
            autoHideDuration={6000}
            onClose={() => setNotification({ ...notification, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert 
              onClose={() => setNotification({ ...notification, open: false })} 
              severity={notification.type} 
              sx={{ 
                width: '100%',
                borderRadius: 2,
                boxShadow: theme.shadows[8],
              }}
            >
              {notification.message}
            </Alert>
          </Snackbar>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SettingsPage; 