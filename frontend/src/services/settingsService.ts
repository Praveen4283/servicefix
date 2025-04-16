import apiClient from './apiClient';
import { 
  GeneralSettings, 
  EmailSettings, 
  TicketSettings,
  IntegrationSettings,
  AdvancedSettings
} from '../types/settings';

class SettingsService {
  private baseUrl = '/settings';

  /**
   * Get general system settings
   */
  async getGeneralSettings(): Promise<GeneralSettings> {
    return apiClient.get<GeneralSettings>(`${this.baseUrl}/general`);
  }

  /**
   * Update general system settings
   * @param settings - The general settings to update
   */
  async updateGeneralSettings(settings: GeneralSettings): Promise<GeneralSettings> {
    return apiClient.put<GeneralSettings>(`${this.baseUrl}/general`, settings);
  }

  /**
   * Get email configuration settings
   */
  async getEmailSettings(): Promise<EmailSettings> {
    return apiClient.get<EmailSettings>(`${this.baseUrl}/email`);
  }

  /**
   * Update email configuration settings
   * @param settings - The email settings to update
   */
  async updateEmailSettings(settings: EmailSettings): Promise<EmailSettings> {
    return apiClient.put<EmailSettings>(`${this.baseUrl}/email`, settings);
  }

  /**
   * Get ticket configuration settings
   */
  async getTicketSettings(): Promise<TicketSettings> {
    return apiClient.get<TicketSettings>(`${this.baseUrl}/ticket`);
  }

  /**
   * Update ticket configuration settings
   * @param settings - The ticket settings to update
   */
  async updateTicketSettings(settings: TicketSettings): Promise<TicketSettings> {
    return apiClient.put<TicketSettings>(`${this.baseUrl}/ticket`, settings);
  }

  /**
   * Test email configuration
   * @param settings - The email settings to test
   */
  async testEmailSettings(settings: EmailSettings): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(`${this.baseUrl}/email/test`, settings);
  }

  /**
   * Get integration settings
   */
  async getIntegrationSettings(): Promise<IntegrationSettings> {
    return apiClient.get<IntegrationSettings>(`${this.baseUrl}/integrations`);
  }

  /**
   * Update integration settings
   * @param settings - The integration settings to update
   */
  async updateIntegrationSettings(settings: IntegrationSettings): Promise<IntegrationSettings> {
    return apiClient.put<IntegrationSettings>(`${this.baseUrl}/integrations`, settings);
  }

  /**
   * Test integration connection
   * @param type - The integration type to test (slack, teams, jira, github)
   * @param settings - The integration settings to test
   */
  async testIntegrationConnection(
    type: string, 
    settings: Partial<IntegrationSettings>
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/integrations/${type}/test`, 
      settings
    );
  }

  /**
   * Get advanced settings
   */
  async getAdvancedSettings(): Promise<AdvancedSettings> {
    return apiClient.get<AdvancedSettings>(`${this.baseUrl}/advanced`);
  }

  /**
   * Update advanced settings
   * @param settings - The advanced settings to update
   */
  async updateAdvancedSettings(settings: AdvancedSettings): Promise<AdvancedSettings> {
    return apiClient.put<AdvancedSettings>(`${this.baseUrl}/advanced`, settings);
  }
}

// Create and export a singleton instance
const settingsService = new SettingsService();
export default settingsService; 