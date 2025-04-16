import axios from 'axios';
import { Ticket } from '../models/Ticket';

class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey || this.apiKey === 'your-gemini-api-key') {
      console.error('Error: Valid Gemini API key is missing. Please set GEMINI_API_KEY in your .env file.');
    }
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Analyze sentiment of ticket description
   * @param text Ticket description text
   * @returns Sentiment score from -1 (negative) to 1 (positive)
   */
  async analyzeSentiment(text: string): Promise<number> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/models/gemini-2.5-pro-exp-03-25:generateContent?key=${this.apiKey}`,
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
      console.error('Error analyzing sentiment:', error);
      return 0;
    }
  }

  /**
   * Automatically categorize ticket based on content
   * @param ticket Ticket to categorize
   * @returns Suggested category
   */
  async categorizeTicket(ticket: Ticket): Promise<string> {
    try {
      const text = `${ticket.subject}\n${ticket.description}`;
      
      const response = await axios.post(
        `${this.baseUrl}/models/gemini-2.5-pro-exp-03-25:generateContent?key=${this.apiKey}`,
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
      console.error('Error categorizing ticket:', error);
      return 'General Inquiry';
    }
  }

  /**
   * Suggest priority based on ticket content
   * @param ticket Ticket to analyze
   * @returns Suggested priority level
   */
  async suggestPriority(ticket: Ticket): Promise<string> {
    try {
      const text = `${ticket.subject}\n${ticket.description}`;
      
      const response = await axios.post(
        `${this.baseUrl}/models/gemini-2.5-pro-exp-03-25:generateContent?key=${this.apiKey}`,
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
      console.error('Error suggesting priority:', error);
      return 'medium';
    }
  }

  /**
   * Generate an AI response suggestion for a ticket
   * @param ticket Ticket to respond to
   * @returns Suggested response text
   */
  async suggestResponse(ticket: Ticket): Promise<string> {
    try {
      const text = `${ticket.subject}\n${ticket.description}`;
      
      const response = await axios.post(
        `${this.baseUrl}/models/gemini-2.5-pro-exp-03-25:generateContent?key=${this.apiKey}`,
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
      console.error('Error generating response suggestion:', error);
      return '';
    }
  }
}

export default new AIService();