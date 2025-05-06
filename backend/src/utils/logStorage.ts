import { supabase } from './supabase';

// Constants
const logBucketName = process.env.SUPABASE_LOG_BUCKET || 'service-logs';

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
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    
    // Create path structure: logs/[source]/[logType]/YYYY/MM/DD/[timestamp].log
    const timestamp = Date.now();
    const filePath = `logs/${source}/${logType}/${year}/${month}/${day}/${timestamp}.log`;
    
    // Upload log entry as text file
    const { error } = await supabase.storage
      .from(logBucketName)
      .upload(filePath, logEntry, {
        contentType: 'text/plain',
        upsert: false,
      });
      
    if (error) {
      console.error(`Supabase log storage upload failed: ${error.message}`);
    }
  } catch (error: any) {
    // We need to use console.error here to avoid an infinite loop of logging
    console.error(`Log upload error: ${error.message}`);
  }
}; 