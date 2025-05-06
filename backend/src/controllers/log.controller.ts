import { Request, Response } from 'express';
import { logger, logWithMetadata } from '../utils/logger';
import { uploadLogToStorage } from '../utils/logStorage';

export const logController = {
  /**
   * Save logs from frontend
   * @route POST /api/logs
   * @access Public
   */
  saveFrontendLog: async (req: Request, res: Response) => {
    try {
      // Check if it's a batch of logs or a single log
      const logs = Array.isArray(req.body) ? req.body : [req.body];
      
      if (logs.length === 0) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'No logs provided' 
        });
      }
      
      // Process each log in the batch
      for (const logData of logs) {
        const { level, message, timestamp, appName, meta, userAgent, url, sessionId, userId } = logData;
        
        // Only accept valid log levels
        const validLevels = ['error', 'warn', 'info', 'debug', 'http'];
        if (!validLevels.includes(level)) {
          continue; // Skip invalid logs rather than failing the whole batch
        }

        // Format log entry for Supabase
        const logEntry = `${timestamp || new Date().toISOString()} ${level}: ${message}
User-Agent: ${userAgent || 'not provided'}
URL: ${url || 'not provided'}
Session: ${sessionId || 'not provided'}
User: ${userId || 'anonymous'}
${meta ? `\nMetadata: ${JSON.stringify(meta)}` : ''}
IP: ${req.ip}`;
        
        // First, log using the backend logger
        logWithMetadata(level, `[FRONTEND-${appName || 'app'}] ${message}`, {
          timestamp,
          appName,
          meta,
          userAgent,
          url,
          sessionId,
          userId,
          ip: req.ip
        });

        // Then, if Supabase storage is enabled, upload directly to Supabase
        // Don't await to avoid slowing down the response
        const useSupabaseStorage = process.env.USE_SUPABASE_LOGS === 'true';
        if (useSupabaseStorage) {
          uploadLogToStorage(logEntry, level, 'frontend')
            .catch(error => console.error('Error uploading frontend log to Supabase:', error));
        }
      }

      // Return success
      return res.status(200).json({ 
        status: 'success',
        message: `${logs.length} log(s) saved successfully`
      });
    } catch (error: any) {
      logger.error(`Error saving frontend log: ${error.message}`);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to save log' 
      });
    }
  }
}; 