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

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// Import path to allow filesystem access

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Log the Supabase URL and key (masked for security)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
console.log(`SUPABASE_URL: ${supabaseUrl ? 'Found' : 'Not found'}`);

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
const filterLevel = args.level || 'all'; // Filter logs by level
const searchText = args.search || ''; // Search within log messages

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

interface LogFile {
  path: string;
  entries: LogEntry[];
}

async function retrieveLogs() {
  try {
    console.log(`Retrieving logs from Supabase storage...`);
    console.log(`Date: ${date}, Source: ${source}, Type: ${logType}, Output: ${outputFormat}`);
    
    // List of files to fetch
    const filesToFetch: string[] = [];
    
    // Two approaches to get logs:
    // 1. If specific date is requested, we can target specific files
    // 2. Otherwise, we need to list all logs and filter
    
    // With the new structure, logs are organized as:
    // logs/[source]/[logType]/YYYY-MM-DD.json
    
    // For sources
    const sources = source === 'both' ? ['frontend', 'backend'] : [source];
    
    // For log types
    const logTypes = logType === 'all' ? ['error', 'http', 'general'] : [logType];
    
    // Construct file paths
    for (const src of sources) {
      for (const type of logTypes) {
        // If specific date is requested
        if (date) {
          filesToFetch.push(`logs/${src}/${type}/${date}.json`);
        } else {
          // List all logs for this source and type
          const { data: files, error } = await supabase!.storage
            .from(logBucketName)
            .list(`logs/${src}/${type}/`, {
              limit: 1000,
              sortBy: { column: 'name', order: 'desc' } // Latest first
            });
          
          if (error) {
            console.error(`Error listing files for ${src}/${type}: ${error.message}`);
            continue;
          }
          
          if (!files || files.length === 0) {
            console.log(`No logs found for ${src}/${type}`);
            continue;
          }
          
          // Add all JSON files
          for (const file of files) {
            if (file.name.endsWith('.json')) {
              filesToFetch.push(`logs/${src}/${type}/${file.name}`);
            }
          }
        }
      }
    }
    
    console.log(`Found ${filesToFetch.length} log files to process.`);
    
    if (filesToFetch.length === 0) {
      console.log('No matching log files found.');
      return;
    }
    
    // Download and process each log file
    const logFiles: LogFile[] = [];
    
    for (const filePath of filesToFetch) {
      try {
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
        
        // Parse JSON content
        const text = await data.text();
        let entries: LogEntry[] = [];
        
        try {
          entries = JSON.parse(text);
          
          // Apply additional filtering if needed
          if (filterLevel && filterLevel !== 'all') {
            entries = entries.filter(entry => entry.level === filterLevel);
          }
          
          if (searchText) {
            entries = entries.filter(entry => 
              entry.message.toLowerCase().includes(searchText.toLowerCase())
            );
          }
          
          logFiles.push({
            path: filePath,
            entries
          });
        } catch (parseError) {
          console.error(`Error parsing ${filePath}: ${parseError}`);
          continue;
        }
      } catch (downloadError) {
        console.error(`Error processing ${filePath}: ${downloadError}`);
        continue;
      }
    }
    
    // Output the logs
    if (outputFormat === 'json') {
      // Write to JSON file
      const outputFile = path.join(outputDir, `logs-${date || 'all'}-${source}-${logType}.json`);
      
      // Create a flattened structure for easier analysis
      const flattenedLogs = logFiles.flatMap(file => 
        file.entries.map(entry => ({
          ...entry,
          source: file.path.split('/')[1], // Extract source from path
          logType: file.path.split('/')[2], // Extract log type from path
        }))
      );
      
      fs.writeFileSync(outputFile, JSON.stringify(flattenedLogs, null, 2));
      console.log(`Logs written to ${outputFile}`);
    } else {
      // Write to text file
      const outputFile = path.join(outputDir, `logs-${date || 'all'}-${source}-${logType}.txt`);
      
      let text = '';
      for (const file of logFiles) {
        text += `=== ${file.path} ===\n`;
        
        for (const entry of file.entries) {
          text += `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}\n`;
          if (entry.metadata) {
            text += `METADATA: ${JSON.stringify(entry.metadata, null, 2)}\n`;
          }
          text += '---\n';
        }
        
        text += '\n';
      }
      
      fs.writeFileSync(outputFile, text);
      console.log(`Logs written to ${outputFile}`);
    }
    
    // Summary stats
    const totalEntries = logFiles.reduce((sum, file) => sum + file.entries.length, 0);
    console.log(`Retrieved ${logFiles.length} log files with ${totalEntries} log entries.`);
    
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the retrieval
retrieveLogs(); 