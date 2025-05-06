/**
 * Script to retrieve and analyze logs from Supabase storage
 * Run with: npx ts-node src/scripts/retrieveSupabaseLogs.ts
 * 
 * Optional arguments:
 * --source=frontend|backend (default: both)
 * --type=error|http|general (default: all)
 * --date=YYYY-MM-DD (default: today)
 * --output=json|text (default: text)
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from the correct path
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

// Log the Supabase URL and key (masked for security)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
console.log(`SUPABASE_URL: ${supabaseUrl ? 'Found' : 'Not found'}`);
console.log(`SUPABASE_KEY: ${supabaseKey ? 'Found (masked for security)' : 'Not found'}`);

// Import supabase after loading environment variables
import { supabase } from '../utils/supabase';

// Check if Supabase is initialized
if (!supabase) {
  console.error('Error: Supabase client is not initialized due to missing environment variables.');
  console.error('Please ensure SUPABASE_URL and SUPABASE_KEY are set in your .env file.');
  process.exit(1);
}

// Constants
const logBucketName = process.env.SUPABASE_LOG_BUCKET || 'service-logs';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc: Record<string, string>, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value;
  }
  return acc;
}, {});

// Default values
const source = args.source || 'both'; // 'frontend', 'backend', or 'both'
const logType = args.type || 'all'; // 'error', 'http', 'general', or 'all'
const date = args.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const outputFormat = args.output || 'text'; // 'json' or 'text'
const outputDir = args.outputDir || path.join(process.cwd(), 'downloaded-logs');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Date components
const [year, month, day] = date.split('-');

async function retrieveLogs() {
  try {
    console.log(`Retrieving logs from Supabase storage...`);
    console.log(`Date: ${date}, Source: ${source}, Type: ${logType}, Output: ${outputFormat}`);
    
    // Construct the prefix based on filters
    let prefix = 'logs/';
    
    if (source !== 'both') {
      prefix += `${source}/`;
    }
    
    if (logType !== 'all') {
      prefix += `${logType}/`;
    }
    
    // Add date components
    prefix += `${year}/${month}/${day}/`;
    
    console.log(`Searching for logs with prefix: ${prefix}`);
    
    // At this point supabase is not null because we exit early if it is
    // List all logs matching the prefix
    const { data: files, error } = await supabase!.storage
      .from(logBucketName)
      .list(prefix, {
        limit: 1000, // Adjust based on your needs
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      throw new Error(`Error retrieving logs: ${error.message}`);
    }
    
    if (!files || files.length === 0) {
      console.log('No logs found matching the criteria.');
      return;
    }
    
    console.log(`Found ${files.length} log files.`);
    
    // Download and process each log file
    const logContents: { path: string; content: string }[] = [];
    
    for (const file of files) {
      // Construct full path
      const filePath = `${prefix}${file.name}`;
      
      // Download the file
      const { data, error } = await supabase!.storage
        .from(logBucketName)
        .download(filePath);
      
      if (error) {
        console.error(`Error downloading ${filePath}: ${error.message}`);
        continue;
      }
      
      if (!data) {
        console.warn(`No content in ${filePath}`);
        continue;
      }
      
      // Convert blob to text
      const content = await data.text();
      
      logContents.push({
        path: filePath,
        content,
      });
    }
    
    // Output the logs
    if (outputFormat === 'json') {
      // Write to JSON file
      const outputFile = path.join(outputDir, `logs-${date}-${source}-${logType}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(logContents, null, 2));
      console.log(`Logs written to ${outputFile}`);
    } else {
      // Write to text file
      const outputFile = path.join(outputDir, `logs-${date}-${source}-${logType}.txt`);
      const text = logContents.map(log => `--- ${log.path} ---\n${log.content}\n\n`).join('\n');
      fs.writeFileSync(outputFile, text);
      console.log(`Logs written to ${outputFile}`);
    }
    
    console.log(`Retrieved ${logContents.length} log files.`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Execute the function
retrieveLogs(); 