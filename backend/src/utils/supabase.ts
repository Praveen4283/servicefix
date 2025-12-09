import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { logger } from './logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'ticket-attachments';
const logBucketName = process.env.SUPABASE_LOG_BUCKET || 'service-logs';

// Validate Supabase credentials in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!supabaseUrl || !supabaseKey)) {
  throw new Error(
    'Missing required Supabase credentials (SUPABASE_URL and/or SUPABASE_KEY) in production environment. ' +
    'File storage functionality requires these credentials to be set.'
  );
}

// Create Supabase client only if credentials are available
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Log warning if credentials are missing in development
if (!supabase && !isProduction) {
  logger.warn('Supabase credentials not configured. File storage will be disabled in development mode.');
}

// Initialize bucket if it doesn't exist
export const initBucket = async () => {
  // Skip if Supabase is not initialized
  if (!supabase) {
    logger.warn('Skipping Supabase bucket initialization due to missing credentials');
    return;
  }

  try {
    logger.info('Initializing Supabase storage buckets...');

    // Check if buckets exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      logger.error(`Error listing buckets: ${listError.message}`);
      logger.error('This might be due to insufficient permissions. Check your Supabase API key and permissions.');
      return;
    }

    if (!buckets) {
      logger.error('No buckets found and no error returned. Check your Supabase configuration.');
      return;
    }

    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    const logBucketExists = buckets.some(bucket => bucket.name === logBucketName);

    if (!bucketExists) {
      // Create bucket with public access
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      });

      if (error) {
        logger.error(`Error creating bucket: ${error.message}`);
      } else {
        logger.info(`Created Supabase storage bucket: ${bucketName}`);
      }
    } else {
      logger.info(`Supabase storage bucket exists: ${bucketName}`);
    }

    if (!logBucketExists) {
      // Create log bucket with private access (logs shouldn't be public)
      const { error } = await supabase.storage.createBucket(logBucketName, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB limit for log files
      });

      if (error) {
        logger.error(`Error creating log bucket: ${error.message}`);
      } else {
        logger.info(`Created Supabase storage log bucket: ${logBucketName}`);
      }
    } else {
      logger.info(`Supabase log bucket exists: ${logBucketName}`);

      // Verify permissions by attempting to upload a test file
      try {
        const testFilePath = 'logs/test/permission-check.json';
        const testContent = JSON.stringify({ test: 'permission check', timestamp: new Date().toISOString() });

        // Try to upload test file
        const { error: uploadError } = await supabase.storage
          .from(logBucketName)
          .upload(testFilePath, testContent, {
            contentType: 'application/json',
            upsert: true,
          });

        if (uploadError) {
          logger.error(`Bucket permission check failed: ${uploadError.message}`);
          logger.error('Log upload will likely fail. Check your Supabase API key permissions.');
        } else {
          logger.info('Log bucket permission check passed successfully.');

          // Clean up test file
          await supabase.storage
            .from(logBucketName)
            .remove([testFilePath]);
        }
      } catch (testError: any) {
        logger.error(`Error during bucket permission check: ${testError.message}`);
      }
    }
  } catch (error: any) {
    logger.error(`Supabase bucket initialization error: ${error.message}`);
  }
};

// Upload file to Supabase Storage
export const uploadFile = async (
  file: Express.Multer.File,
  folder = 'tickets',
  ticketId?: number
): Promise<string> => {
  // Return placeholder URL if Supabase is not initialized
  if (!supabase) {
    logger.warn('Skipping file upload due to missing Supabase credentials');
    return 'https://placeholder-file-url.com/file-not-uploaded';
  }

  // Create a unique file path
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filePath = `${folder}/${ticketId ? `ticket-${ticketId}/` : ''}${uniqueSuffix}-${file.originalname}`;

  try {
    // Upload file
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error: any) {
    logger.error(`File upload error: ${error.message}`);
    throw error;
  }
};

// Delete file from Supabase Storage
export const deleteFile = async (filePath: string): Promise<void> => {
  // Skip if Supabase is not initialized
  if (!supabase) {
    logger.warn('Skipping file deletion due to missing Supabase credentials');
    return;
  }

  try {
    // Extract the path from the full URL
    let path = filePath;
    if (filePath.includes(`${bucketName}/`)) {
      path = filePath.split(`${bucketName}/`)[1];
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      logger.error(`Error deleting file: ${error.message}`);
    }
  } catch (error: any) {
    logger.error(`File deletion error: ${error.message}`);
  }
}; 