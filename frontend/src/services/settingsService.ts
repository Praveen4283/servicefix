import apiClient from './apiClient';
import { 
  GeneralSettings, 
  EmailSettings, 
  TicketSettings,
  IntegrationSettings,
  AdvancedSettings
} from '../types/settings';

// Get email settings
const getEmailSettings = async (): Promise<EmailSettings> => {
  return apiClient.get('/settings/email');
};

// Update email settings
const updateEmailSettings = async (emailSettings: EmailSettings): Promise<EmailSettings> => {
  return apiClient.put('/settings/email', emailSettings);
};

// Test email settings
const testEmailSettings = async (emailSettings: EmailSettings): Promise<{ success: boolean; message: string }> => {
  return apiClient.post('/settings/email/test', emailSettings);
};

// Get general settings
const getGeneralSettings = async (): Promise<GeneralSettings> => {
  return apiClient.get('/settings/general');
};

// Update general settings
const updateGeneralSettings = async (generalSettings: GeneralSettings): Promise<GeneralSettings> => {
  return apiClient.put('/settings/general', generalSettings);
};

// Get ticket settings
const getTicketSettings = async (): Promise<TicketSettings> => {
  return apiClient.get('/settings/ticket');
};

// Update ticket settings
const updateTicketSettings = async (ticketSettings: TicketSettings): Promise<TicketSettings> => {
  return apiClient.put('/settings/ticket', ticketSettings);
};

// Get SLA settings
const getSLASettings = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/settings/sla');
    console.log('Raw SLA settings response:', response);
    
    // Normalize the response format for consistency
    if (response && typeof response === 'object') {
      // If the response is already in the expected format with policies array
      if (Array.isArray(response.policies)) {
        return response;
      }
      
      // If policies are inside a data property
      if (response.data && Array.isArray(response.data.policies)) {
        return response.data;
      }
      
      // If response is just an array of policies directly
      if (Array.isArray(response)) {
        return { policies: response, organizationId: 1001 };
      }
    }
    
    // Default return with empty policies
    return { policies: [], organizationId: 1001 };
  } catch (error) {
    console.error('Error fetching SLA settings:', error);
    throw error;
  }
};

// Update SLA settings
const updateSLASettings = async (slaSettings: any): Promise<any> => {
  try {
    console.log('Sending SLA settings to server:', slaSettings);
    const response = await apiClient.put('/settings/sla', slaSettings);
    console.log('SLA settings update response:', response);
    return response;
  } catch (error) {
    console.error('Error updating SLA settings:', error);
    throw error;
  }
};

// Get integration settings
const getIntegrationSettings = async (): Promise<IntegrationSettings> => {
  return apiClient.get('/settings/integration');
};

// Update integration settings
const updateIntegrationSettings = async (integrationSettings: IntegrationSettings): Promise<IntegrationSettings> => {
  return apiClient.put('/settings/integration', integrationSettings);
};

// Test integration connection
const testIntegrationConnection = async (type: string, settings: any): Promise<{ success: boolean; message: string }> => {
  return apiClient.post(`/settings/integration/${type}/test`, settings);
};

// Get advanced settings
const getAdvancedSettings = async (): Promise<AdvancedSettings> => {
  return apiClient.get('/settings/advanced');
};

// Update advanced settings
const updateAdvancedSettings = async (advancedSettings: AdvancedSettings): Promise<AdvancedSettings> => {
  return apiClient.put('/settings/advanced', advancedSettings);
};

const settingsService = {
  getEmailSettings,
  updateEmailSettings,
  testEmailSettings,
  getGeneralSettings,
  updateGeneralSettings,
  getTicketSettings,
  updateTicketSettings,
  getIntegrationSettings,
  updateIntegrationSettings,
  testIntegrationConnection,
  getAdvancedSettings,
  updateAdvancedSettings,
  getSLASettings,
  updateSLASettings
};

export default settingsService; 