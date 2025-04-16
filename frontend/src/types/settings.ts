/**
 * General system settings interface
 */
export interface GeneralSettings {
  companyName: string;
  supportEmail: string;
  maxFileSize: number;
  allowGuestTickets: boolean;
  defaultTimeZone: string;
}

/**
 * Email configuration settings interface
 */
export interface EmailSettings {
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  emailFromName: string;
  emailReplyTo: string;
  enableEmailNotifications: boolean;
}

/**
 * Ticket configuration settings interface
 */
export interface TicketSettings {
  defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
  closedTicketReopen: number;
  autoCloseResolved: number;
  enableCustomerSatisfaction: boolean;
  requireCategory: boolean;
}

/**
 * Integration settings interface
 */
export interface IntegrationSettings {
  // Slack Integration
  slackEnabled: boolean;
  slackWebhookUrl: string;
  slackChannel: string;
  slackNotifyOnNewTicket: boolean;
  slackNotifyOnTicketUpdates: boolean;
  
  // Microsoft Teams Integration
  teamsEnabled: boolean;
  teamsWebhookUrl: string;
  teamsNotifyOnNewTicket: boolean;
  teamsNotifyOnTicketUpdates: boolean;

  // Jira Integration
  jiraEnabled: boolean;
  jiraUrl: string;
  jiraUsername: string;
  jiraApiToken: string;
  jiraProject: string;
  jiraCreateIssuesForTickets: boolean;
  
  // GitHub Integration
  githubEnabled: boolean;
  githubAccessToken: string;
  githubRepository: string;
  githubCreateIssuesForTickets: boolean;
}

/**
 * Advanced settings interface
 */
export interface AdvancedSettings {
  // API settings
  apiEnabled: boolean;
  apiRateLimitPerHour: number;
  enableApiDocumentation: boolean;
  
  // Security settings
  maxLoginAttempts: number;
  passwordExpiryDays: number;
  sessionTimeoutMinutes: number;
  enforceMfa: boolean;
  
  // Performance settings
  cacheDurationMinutes: number;
  maxConcurrentFileUploads: number;
  
  // Custom fields
  enableCustomFields: boolean;
  maxCustomFieldsPerTicket: number;
  
  // AI features
  enableAiSuggestions: boolean;
  enableAutoTagging: boolean;
  enableSentimentAnalysis: boolean;
  aiModelName: string;
}

/**
 * Validation errors interface for settings forms
 */
export interface ValidationErrors {
  generalSettings?: Partial<Record<keyof GeneralSettings, string>>;
  emailSettings?: Partial<Record<keyof EmailSettings, string>>;
  ticketSettings?: Partial<Record<keyof TicketSettings, string>>;
  integrationSettings?: Partial<Record<keyof IntegrationSettings, string>>;
  advancedSettings?: Partial<Record<keyof AdvancedSettings, string>>;
}

/**
 * Settings loading state interface
 */
export interface SettingsLoadingState {
  general: boolean;
  email: boolean;
  ticket: boolean;
  integration: boolean;
  advanced: boolean;
}

/**
 * Notification state interface
 */
export interface NotificationState {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
} 