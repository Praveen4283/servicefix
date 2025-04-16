import { createClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { logger } from './logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'ticket-attachments';

if (!supabaseUrl || !supabaseKey) {
  logger.error('Missing Supabase credentials in environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl!, supabaseKey!);

// Initialize bucket if it doesn't exist
export const initBucket = async () => {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
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