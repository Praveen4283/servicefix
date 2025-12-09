#!/usr/bin/env node

/**
 * Automated Console.log Replacement Script
 * 
 * This script safely replaces console.log statements with the production-safe logger utility.
 * It intelligently categorizes log statements and uses appropriate logger methods.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Statistics
let stats = {
    filesProcessed: 0,
    filesModified: 0,
    logsReplaced: 0,
    errors: []
};

/**
 * Categorize console.log and determine appropriate logger method
 */
function categorizeLogStatement(logContent) {
    const content = logContent.toLowerCase();

    // API-related
    if (content.includes('api') || content.includes('request') || content.includes('response') ||
        content.includes('fetch') || content.includes('endpoint')) {
        return 'logger.api';
    }

    // Socket-related
    if (content.includes('socket') || content.includes('connect') || content.includes('disconnect')) {
        return 'logger.socket';
    }

    // Auth-related
    if (content.includes('auth') || content.includes('token') || content.includes('login') ||
        content.includes('logout') || content.includes('csrf')) {
        return 'logger.debug';
    }

    // Error/Warning patterns
    if (content.includes('error') || content.includes('failed') || content.includes('fail')) {
        return 'logger.error';
    }

    if (content.includes('warn') || content.includes('missing') || content.includes('invalid')) {
        return 'logger.warn';
    }

    // Success patterns
    if (content.includes('success') || content.includes('complete') || content.includes('initialized')) {
        return 'logger.info';
    }

    // Default to debug for everything else
    return 'logger.debug';
}

/**
 * Extract the arguments from a console.log statement
 */
function extractLogArguments(statement) {
    // Match console.log(...) and extract the content inside parentheses
    const match = statement.match(/console\.log\s*\(([\s\S]*?)\)\s*;?$/);
    if (!match) return null;

    return match[1].trim();
}

/**
 * Clean up log message - remove [Service Name] prefixes
 */
function cleanLogMessage(args) {
    // Remove common prefixes like [API Client], [Socket Service], etc.
    return args.replace(/^\s*['"`]\[[\w\s]+\]\s+/g, "'");
}

/**
 * Convert console.log to logger call
 */
function convertConsoleLog(statement, lineNumber) {
    const args = extractLogArguments(statement);
    if (!args) {
        stats.errors.push(`Line ${lineNumber}: Could not parse console.log arguments`);
        return statement;
    }

    // Clean the message
    const cleanedArgs = cleanLogMessage(args);

    // Determine the logger method
    const loggerMethod = categorizeLogStatement(cleanedArgs);

    // Special handling for API request/response patterns
    if (loggerMethod === 'logger.api') {
        // Check for common API patterns
        if (cleanedArgs.includes('Request') || cleanedArgs.includes('Requesting')) {
            const urlMatch = cleanedArgs.match(/\$\{([^}]+)\}/);
            if (urlMatch) {
                return `logger.api.request(${urlMatch[1]});`;
            }
        }
        if (cleanedArgs.includes('Response') || cleanedArgs.includes('Received')) {
            const urlMatch = cleanedArgs.match(/\$\{([^}]+)\}/);
            if (urlMatch) {
                return `logger.api.response(${urlMatch[1]});`;
            }
        }
    }

    // Special handling for socket events
    if (loggerMethod === 'logger.socket') {
        if (cleanedArgs.toLowerCase().includes('connect')) {
            return `logger.socket.connect('connection');`;
        }
        if (cleanedArgs.toLowerCase().includes('disconnect')) {
            return `logger.socket.disconnect('disconnection');`;
        }
    }

    // Default replacement
    return `${loggerMethod}(${cleanedArgs});`;
}

/**
 * Process a single file
 */
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        let modified = false;
        let replacementCount = 0;
        const newLines = [];

        // Check if logger is already imported
        const hasLoggerImport = content.includes("from '../utils/frontendLogger'") ||
            content.includes('from "../utils/frontendLogger"');

        let addedImport = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if this line contains console.log
            if (line.includes('console.log(')) {
                // Convert the console.log statement
                const indentation = line.match(/^(\s*)/)[1];
                const converted = convertConsoleLog(line.trim(), i + 1);

                if (converted !== line.trim()) {
                    newLines.push(indentation + converted);
                    modified = true;
                    replacementCount++;

                    if (VERBOSE) {
                        console.log(`  Line ${i + 1}: ${line.trim()} -> ${converted}`);
                    }
                } else {
                    newLines.push(line);
                }
            } else {
                // Add logger import after the last import statement if needed
                if (!hasLoggerImport && !addedImport && line.match(/^import .+ from/)) {
                    // Check if the next line is also an import
                    if (i + 1 < lines.length && !lines[i + 1].match(/^import/)) {
                        newLines.push(line);
                        newLines.push("import { logger } from '../utils/frontendLogger';");
                        addedImport = true;
                        continue;
                    }
                }
                newLines.push(line);
            }
        }

        if (modified) {
            stats.filesModified++;
            stats.logsReplaced += replacementCount;

            if (!DRY_RUN) {
                fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
                console.log(`✅ Modified ${filePath}: ${replacementCount} replacements`);
            } else {
                console.log(`🔍 [DRY RUN] Would modify ${filePath}: ${replacementCount} replacements`);
            }
        } else {
            if (VERBOSE) {
                console.log(`⏭️  Skipped ${filePath}: No console.log found`);
            }
        }

        stats.filesProcessed++;
    } catch (error) {
        stats.errors.push(`Error processing ${filePath}: ${error.message}`);
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

/**
 * Find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules and build directories
            if (!file.startsWith('.') && file !== 'node_modules' && file !== 'build' && file !== 'dist') {
                findTypeScriptFiles(filePath, fileList);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            // Skip definition files
            if (!file.endsWith('.d.ts')) {
                fileList.push(filePath);
            }
        }
    });

    return fileList;
}

/**
 * Main function
 */
function main() {
    console.log('🔧 Console.log Replacement Script\n');

    if (DRY_RUN) {
        console.log('⚠️  DRY RUN MODE - No files will be modified\n');
    }

    // Get the target directory from command line or use default
    // Skip first 2 args (node path and script path)
    const args = process.argv.slice(2);
    const targetDir = args.find(arg => !arg.startsWith('--')) ||
        path.join(__dirname, '..', 'src', 'services');

    if (!fs.existsSync(targetDir)) {
        console.error(`❌ Directory not found: ${targetDir}`);
        process.exit(1);
    }

    console.log(`📁 Scanning directory: ${targetDir}\n`);

    // Find all TypeScript files
    const files = findTypeScriptFiles(targetDir);
    console.log(`📄 Found ${files.length} TypeScript files\n`);

    // Process each file
    files.forEach(processFile);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Files modified: ${stats.filesModified}`);
    console.log(`Logs replaced: ${stats.logsReplaced}`);

    if (stats.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
        stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (DRY_RUN) {
        console.log('\n💡 Run without --dry-run to apply changes');
    }

    console.log('='.repeat(60));
}

//Run the script
if (require.main === module) {
    main();
}

module.exports = { processFile, convertConsoleLog, categorizeLogStatement };
