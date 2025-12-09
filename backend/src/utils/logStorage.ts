import { supabase } from './supabase';
import { logger } from './logger';

// Constants
const logBucketName = process.env.SUPABASE_LOG_BUCKET || 'service-logs';
const BUFFER_FLUSH_INTERVAL = parseInt(process.env.LOG_BUFFER_FLUSH_INTERVAL || '30000'); // 30 seconds
const FORCE_FLUSH_ERROR_COUNT = parseInt(process.env.LOG_FORCE_FLUSH_ERROR_COUNT || '5'); // Force flush after 5 errors

// Log buffer stores logs by day, source, and type
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

class LogBuffer {
  private buffer: Record<string, Record<string, Record<string, LogEntry[]>>> = {};
  private flushTimer: NodeJS.Timeout | null = null;
  private errorCount: Record<string, number> = {};

  constructor() {
    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (this.flushTimer === null) {
      this.flushTimer = setInterval(() => {
        this.flushAll();
      }, BUFFER_FLUSH_INTERVAL);
    }
  }

  public stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Get buffer key in format: YYYY-MM-DD_source_logType
  private getBufferKey(logDate: Date, source: string, logType: string): { dateKey: string, fileKey: string } {
    const year = logDate.getFullYear();
    const month = String(logDate.getMonth() + 1).padStart(2, '0');
    const day = String(logDate.getDate()).padStart(2, '0');

    const dateKey = `${year}-${month}-${day}`;
    return {
      dateKey,
      fileKey: `logs/${source}/${logType}/${dateKey}.json`
    };
  }

  // Add a log entry to the buffer
  public addLog(logEntry: string, logType: string, source: string): void {
    try {
      // Parse the log entry into a structured format
      const timestamp = new Date().toISOString();
      const parsedEntry: LogEntry = {
        timestamp,
        level: logType,
        message: logEntry
      };

      const logDate = new Date();
      const { dateKey, fileKey } = this.getBufferKey(logDate, source, logType);

      // Initialize buffer hierarchies if they don't exist
      if (!this.buffer[dateKey]) {
        this.buffer[dateKey] = {};
      }

      if (!this.buffer[dateKey][source]) {
        this.buffer[dateKey][source] = {};
      }

      if (!this.buffer[dateKey][source][logType]) {
        this.buffer[dateKey][source][logType] = [];
      }

      // Add to buffer
      this.buffer[dateKey][source][logType].push(parsedEntry);

      // Track error count for this buffer key
      if (logType === 'error') {
        if (!this.errorCount[fileKey]) {
          this.errorCount[fileKey] = 0;
        }
        this.errorCount[fileKey]++;

        // Force flush if error count threshold exceeded
        if (this.errorCount[fileKey] >= FORCE_FLUSH_ERROR_COUNT) {
          this.flush(dateKey, source, logType).catch(err => {
            console.error(`Failed to force flush error logs: ${err.message}`);
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error adding log to buffer: ${errorMessage}`);
    }
  }

  // Flush all buffered logs
  public async flushAll(): Promise<void> {
    // Clone and clear the buffer to avoid race conditions
    const bufferToFlush = { ...this.buffer };
    this.buffer = {};
    this.errorCount = {};

    // Keep track of failed flushes
    const failedFlushes: Array<{ dateKey: string, source: string, logType: string, logs: LogEntry[] }> = [];

    // Process each date key
    for (const dateKey in bufferToFlush) {
      for (const source in bufferToFlush[dateKey]) {
        for (const logType in bufferToFlush[dateKey][source]) {
          if (bufferToFlush[dateKey][source][logType].length === 0) {
            continue;
          }

          try {
            await this.uploadLogs(
              dateKey,
              source,
              logType,
              bufferToFlush[dateKey][source][logType]
            );
            // Log success but only in debug environments to avoid log spam
            if (process.env.NODE_ENV !== 'production') {
              console.log(`Successfully flushed ${bufferToFlush[dateKey][source][logType].length} logs for ${dateKey}/${source}/${logType}`);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error flushing logs for ${dateKey}/${source}/${logType}: ${errorMessage}`);

            // Save failed flush for retry
            failedFlushes.push({
              dateKey,
              source,
              logType,
              logs: bufferToFlush[dateKey][source][logType]
            });
          }
        }
      }
    }

    // Put failed flushes back in the buffer for retry on next flush
    for (const failed of failedFlushes) {
      const { dateKey, source, logType, logs } = failed;

      // Reinitialize buffer hierarchies if they don't exist
      if (!this.buffer[dateKey]) this.buffer[dateKey] = {};
      if (!this.buffer[dateKey][source]) this.buffer[dateKey][source] = {};
      if (!this.buffer[dateKey][source][logType]) this.buffer[dateKey][source][logType] = [];

      // Put logs back
      this.buffer[dateKey][source][logType] = [
        ...this.buffer[dateKey][source][logType],
        ...logs
      ];
    }

    // Log summary of failed flushes if any
    if (failedFlushes.length > 0) {
      console.warn(`${failedFlushes.length} log flushes failed and will be retried later.`);
    }
  }

  // Flush specific logs by date, source, and type
  public async flush(dateKey: string, source: string, logType: string): Promise<void> {
    if (!this.buffer[dateKey] ||
      !this.buffer[dateKey][source] ||
      !this.buffer[dateKey][source][logType] ||
      this.buffer[dateKey][source][logType].length === 0) {
      return;
    }

    // Get logs to flush
    const logsToFlush = [...this.buffer[dateKey][source][logType]];

    // Clear from buffer
    this.buffer[dateKey][source][logType] = [];
    if (this.errorCount[`logs/${source}/${logType}/${dateKey}.json`]) {
      this.errorCount[`logs/${source}/${logType}/${dateKey}.json`] = 0;
    }

    // Upload
    await this.uploadLogs(dateKey, source, logType, logsToFlush);
  }

  // Upload logs to Supabase
  private async uploadLogs(dateKey: string, source: string, logType: string, logs: LogEntry[]): Promise<void> {
    if (!supabase) {
      console.log('Skipping log upload to Supabase due to missing credentials');
      return;
    }

    if (logs.length === 0) {
      return;
    }

    const { fileKey } = this.getBufferKey(new Date(dateKey), source, logType);

    try {
      let existingLogs: LogEntry[] = [];

      try {
        // Check if file already exists
        const { data: existingFile, error: checkError } = await supabase.storage
          .from(logBucketName)
          .download(fileKey);

        // Handle potential download errors more gracefully
        if (checkError) {
          const errorMessage = typeof checkError === 'object' ?
            JSON.stringify(checkError) : String(checkError);

          // If it's just a "not found" error, that's expected for new files
          if (errorMessage.includes('not found') || errorMessage.includes('Not Found') || errorMessage.includes('404')) {
            console.log(`Creating new log file: ${fileKey}`);
          } else {
            // Log the error but continue with empty logs
            console.warn(`Warning downloading existing log file: ${errorMessage}`);
          }
        } else if (existingFile) {
          // If file exists and was downloaded successfully, parse it
          try {
            const text = await existingFile.text();
            existingLogs = JSON.parse(text);

            // Ensure it's an array
            if (!Array.isArray(existingLogs)) {
              existingLogs = [];
            }
          } catch (parseError) {
            console.error(`Error parsing existing log file: ${parseError}`);
            existingLogs = [];
          }
        }
      } catch (downloadError) {
        // Handle unexpected errors but continue with empty logs
        console.warn(`Unexpected error downloading log file: ${fileKey}`, downloadError);
      }

      // Combine existing and new logs
      const combinedLogs = [...existingLogs, ...logs];

      // Upload combined logs - always attempt to upload even if download failed
      const { error: uploadError } = await supabase.storage
        .from(logBucketName)
        .upload(fileKey, JSON.stringify(combinedLogs, null, 2), {
          contentType: 'application/json',
          upsert: true, // Overwrite if exists
        });

      if (uploadError) {
        const errorMessage = typeof uploadError === 'object' ?
          JSON.stringify(uploadError) : String(uploadError);
        throw new Error(`Supabase log storage upload failed: ${errorMessage}`);
      }
    } catch (error: unknown) {
      // We need to use console.error here to avoid an infinite loop of logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Log upload error for ${fileKey}: ${errorMessage}`);
      throw error; // Re-throw to handle in the calling function
    }
  }
}

// Create a singleton instance
export const logBuffer = new LogBuffer();

// Upload log entry to Supabase Storage
export const uploadLogToStorage = async (
  logEntry: string,
  logType: string,
  source: string = 'backend'
): Promise<void> => {
  // Skip if Supabase is not initialized
  if (!supabase) {
    console.log('Skipping log upload to Supabase due to missing credentials');
    return;
  }

  try {
    // Normalize log type
    let normalizedLogType = 'general';
    if (logType === 'error') {
      normalizedLogType = 'error';
    } else if (logType === 'http') {
      normalizedLogType = 'http';
    }

    // Add to buffer instead of directly uploading
    logBuffer.addLog(logEntry, normalizedLogType, source);
  } catch (error: unknown) {
    // We need to use console.error here to avoid an infinite loop of logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error buffering log: ${errorMessage}`);
  }
};

// Flush all logs - useful for graceful shutdown
export const flushAllLogs = async (): Promise<void> => {
  try {
    await logBuffer.flushAll();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error flushing logs: ${errorMessage}`);
  }
};

// Stop the flush timer - should be called during graceful shutdown
export const stopLogBuffering = (): void => {
  logBuffer.stopFlushTimer();
}; 