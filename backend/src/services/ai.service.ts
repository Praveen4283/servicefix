import axios from 'axios';
import { Ticket } from '../models/Ticket';
import { logger } from '../utils/logger';
import crypto from 'crypto';

class AIService {
  private apiKey: string | null = null;
  private baseUrl: string;
  private modelName: string | null = null;
  private provider: 'gemini' | 'openai' | 'custom' = 'gemini';
  private settingsLoaded: boolean = false;

  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    // Don't load API key in constructor - will load from DB when needed
  }

  /**
   * Decrypt API key using same algorithm as settings controller
   */
  private decryptApiKey(encrypted: string): string {
    try {
      const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-32-char-key-change-prod';
      const ALGORITHM = 'aes-256-cbc';
      const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
      const parts = encrypted.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted format');
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting API key:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Load AI settings from database
   */
  async loadSettings(): Promise<void> {
    try {
      // Import database query function
      const { query } = await import('../config/database');

      // Fetch advanced settings from database
      const result = await query(
        'SELECT ai_api_key, ai_model_name, ai_provider FROM settings WHERE category = $1 LIMIT 1',
        ['advanced']
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];

        // Load AI configuration from database
        if (row.ai_api_key) {
          this.apiKey = this.decryptApiKey(row.ai_api_key);
        } else {
          // Fallback to environment variable
          this.apiKey = process.env.GEMINI_API_KEY || null;
          if (!this.apiKey) {
            logger.warn('AI API key not found in database or environment');
          }
        }

        this.modelName = row.ai_model_name || 'gemini-2.5-pro-exp-03-25';
        this.provider = row.ai_provider || 'gemini';
        this.settingsLoaded = true;

        logger.info(`AI settings loaded: provider=${this.provider}, model=${this.modelName}`);
      } else {
        // No settings in database, fallback to environment
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.modelName = 'gemini-2.5-pro-exp-03-25';
        this.provider = 'gemini';
        this.settingsLoaded = true;

        if (!this.apiKey) {
          logger.warn('AI settings not found in database, using environment variables');
        }
      }
    } catch (error) {
      logger.error('Error loading AI settings:', error);
      // Fallback to environment variables
      this.apiKey = process.env.GEMINI_API_KEY || null;
      this.modelName = 'gemini-2.5-pro-exp-03-25';
      this.provider = 'gemini';
      this.settingsLoaded = true;
    }
  }



  /**
   * Ensure settings are loaded before making API calls
   */
  private async ensureSettingsLoaded(): Promise<void> {
    if (!this.settingsLoaded) {
      await this.loadSettings();
    }

    if (!this.apiKey) {
      throw new Error('AI API key not configured. Please configure AI settings in the admin panel.');
    }
  }

  /**
   * Analyze sentiment of ticket description
   * @param text Ticket description text
   * @returns Sentiment score from -1 (negative) to 1 (positive)
   */
  async analyzeSentiment(text: string): Promise<number> {
    await this.ensureSettingsLoaded();

    try {
      const model = this.modelName || 'gemini-2.5-pro-exp-03-25';
      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'You are an AI assistant that analyzes customer support tickets. Analyze the sentiment of the following text and return only a number between -1 (extremely negative) to 1 (extremely positive), with 0 being neutral.\n\n' + text
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const sentimentScore = parseFloat(response.data.candidates[0].content.parts[0].text.trim());
      return isNaN(sentimentScore) ? 0 : sentimentScore;
    } catch (error) {
      logger.error('Error analyzing sentiment:', error);
      return 0;
    }
  }

  /**
   * Automatically categorize ticket based on content
   * @param ticket Ticket to categorize
   * @returns Suggested category
   */
  async categorizeTicket(ticket: Ticket): Promise<string> {
    await this.ensureSettingsLoaded();

    try {
      const text = `${ticket.subject}\n${ticket.description}`;
      const model = this.modelName || 'gemini-2.5-pro-exp-03-25';

      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'You are an AI assistant that categorizes customer support tickets. Based on the following ticket, determine the most appropriate category from these options: Technical Issue, Billing Question, Feature Request, Account Access, Product Information, General Inquiry. Return only the category name.\n\n' + text
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      logger.error('Error categorizing ticket:', error);
      return 'General Inquiry';
    }
  }

  /**
   * Suggest priority based on ticket content
   * @param ticket Ticket to analyze
   * @returns Suggested priority level
   */
  async suggestPriority(ticket: Ticket): Promise<string> {
    await this.ensureSettingsLoaded();

    try {
      const text = `${ticket.subject}\n${ticket.description}`;
      const model = this.modelName || 'gemini-2.5-pro-exp-03-25';

      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'You are an AI assistant that analyzes the urgency and impact of customer support tickets. Based on the following ticket, determine the most appropriate priority from these options: low, medium, high, urgent. Return only the priority level.\n\n' + text
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim().toLowerCase();
    } catch (error) {
      logger.error('Error suggesting priority:', error);
      return 'medium';
    }
  }

  /**
   * Generate an AI response suggestion for a ticket
   * @param ticket Ticket to respond to
   * @returns Suggested response text
   */
  async suggestResponse(ticket: Ticket): Promise<string> {
    await this.ensureSettingsLoaded();

    try {
      const text = `${ticket.subject}\n${ticket.description}`;
      const model = this.modelName || 'gemini-2.5-pro-exp-03-25';

      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'You are a helpful customer support agent. Draft a professional, friendly response to the following customer inquiry. Be concise but thorough.\n\n' + text
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      logger.error('Error generating response suggestion:', error);
      return '';
    }
  }

  /**
   * Generate a summary of ticket conversation
   * @param text Conversation or ticket history to summarize
   * @returns Concise summary
   */
  async generateSummary(text: string): Promise<string> {
    await this.ensureSettingsLoaded();

    try {
      const model = this.modelName || 'gemini-2.5-pro-exp-03-25';
      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'You are a helpful assistant that summarizes customer support conversations. Provide a concise, clear summary of the following ticket conversation, highlighting the main issue, any important updates, and current status.\n\n' + text
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 200,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      logger.error('Error generating summary:', error);
      return '';
    }
  }
}

export default new AIService();