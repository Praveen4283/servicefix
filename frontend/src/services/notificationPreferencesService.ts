import apiClient from './apiClient';

// Define the notification event types
export enum NotificationEventType {
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_COMMENT = 'ticket_comment',
  MENTION = 'mention',
  SLA_BREACH = 'sla_breach',
  SYSTEM_ALERT = 'system_alert',
  // Add these fields to match what we're seeing from the API logs
  NEW_TICKET_ASSIGNED = 'newTicketAssigned',
  TICKET_UPDATED_STATUS = 'ticketUpdated',
  MENTION_IN_COMMENT = 'mentionInComment',
  SYSTEM_UPDATES = 'systemUpdates',
  NEW_KB_ARTICLE = 'newKbArticle'
}

// Interface for notification preference
export interface NotificationPreference {
  id?: string;
  userId?: string;
  eventType: NotificationEventType | string; // Allow for string to handle unexpected types
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  // Add alternative format properties to handle different API responses
  email?: boolean;
  push?: boolean;
  in_app?: boolean;
}

// Define display names for the notification types
export const notificationEventNames: Record<NotificationEventType, string> = {
  [NotificationEventType.TICKET_ASSIGNED]: 'Ticket assigned to you',
  [NotificationEventType.TICKET_UPDATED]: 'Ticket updated',
  [NotificationEventType.TICKET_COMMENT]: 'New comment on ticket',
  [NotificationEventType.MENTION]: 'You are mentioned',
  [NotificationEventType.SLA_BREACH]: 'SLA deadline approaching',
  [NotificationEventType.SYSTEM_ALERT]: 'System alerts',
  // Add names for the new event types
  [NotificationEventType.NEW_TICKET_ASSIGNED]: 'New ticket assigned to you',
  [NotificationEventType.TICKET_UPDATED_STATUS]: 'Ticket status updated',
  [NotificationEventType.MENTION_IN_COMMENT]: 'You are mentioned in a comment',
  [NotificationEventType.SYSTEM_UPDATES]: 'System updates',
  [NotificationEventType.NEW_KB_ARTICLE]: 'New knowledge base article'
};

// Define descriptions for the notification types
export const notificationEventDescriptions: Record<NotificationEventType, string> = {
  [NotificationEventType.TICKET_ASSIGNED]: 'Receive notifications when a ticket is assigned to you',
  [NotificationEventType.TICKET_UPDATED]: 'Receive notifications when a ticket you are involved with is updated',
  [NotificationEventType.TICKET_COMMENT]: 'Receive notifications when someone comments on your ticket',
  [NotificationEventType.MENTION]: 'Receive notifications when someone mentions you',
  [NotificationEventType.SLA_BREACH]: 'Receive notifications when a ticket is approaching its SLA deadline',
  [NotificationEventType.SYSTEM_ALERT]: 'Receive system alerts and announcements',
  // Add descriptions for the new event types
  [NotificationEventType.NEW_TICKET_ASSIGNED]: 'Receive notifications when a new ticket is assigned to you',
  [NotificationEventType.TICKET_UPDATED_STATUS]: 'Receive notifications when a ticket status is updated',
  [NotificationEventType.MENTION_IN_COMMENT]: 'Receive notifications when you are mentioned in a comment',
  [NotificationEventType.SYSTEM_UPDATES]: 'Receive notifications about system updates',
  [NotificationEventType.NEW_KB_ARTICLE]: 'Receive notifications when new knowledge base articles are published'
};

/**
 * Service to handle notification preferences
 */
const notificationPreferencesService = {
  /**
   * Get notification preferences for the current user
   * @returns Promise that resolves to user's notification preferences
   */
  getUserPreferences: async (): Promise<NotificationPreference[]> => {
    try {
      const preferences = await apiClient.get<NotificationPreference[]>('/notifications/preferences');
      return preferences;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      // Return default preferences if API call fails
      return getDefaultPreferences();
    }
  },

  /**
   * Update a notification preference
   * @param preference The preference to update
   * @returns Promise that resolves when operation completes
   */
  updatePreference: async (preference: NotificationPreference): Promise<NotificationPreference> => {
    try {
      const updatedPreference = await apiClient.put<NotificationPreference>(
        `/notifications/preferences/${preference.eventType}`,
        preference
      );
      return updatedPreference;
    } catch (error) {
      console.error(`Error updating notification preference for ${preference.eventType}:`, error);
      throw error;
    }
  },

  /**
   * Update multiple notification preferences in bulk
   * @param preferences Array of preferences to update
   * @returns Promise that resolves when operation completes
   */
  updatePreferences: async (preferences: NotificationPreference[]): Promise<NotificationPreference[]> => {
    try {
      const updatedPreferences = await apiClient.put<NotificationPreference[]>(
        '/notifications/preferences',
        { preferences }
      );
      return updatedPreferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
};

/**
 * Get default notification preferences for all event types
 * @returns Array of default notification preferences
 */
export function getDefaultPreferences(): NotificationPreference[] {
  return Object.values(NotificationEventType).map(eventType => ({
    eventType,
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true
  }));
}

export default notificationPreferencesService; 