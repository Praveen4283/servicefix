import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

/**
 * Middleware to detect and block SQL injection attempts
 */
export const preventSqlInjection = (req: Request, res: Response, next: NextFunction) => {
    // Function to check for SQL injection patterns
    const hasSqlInjection = (value: string): boolean => {
        // SQL injection pattern regex
        const sqlPatterns = [
            /(\s|;|^)select(\s|\*|.|$)/i,
            /(\s|;|^)insert(\s|.|$)/i,
            /(\s|;|^)update(\s|.|$)/i,
            /(\s|;|^)delete(\s|.|$)/i,
            /(\s|;|^)drop(\s|.|$)/i,
            /(\s|;|^)union(\s|.|$)/i,
            /(\s|;|^)truncate(\s|.|$)/i,
            /(\s|;|^)alter(\s|.|$)/i,
            /(\s|;|^)exec(\s|.|$)/i,
            /(\s|;|^)create(\s|.|$)/i,
            /(\s|;|^)--/i,
            /(\s|;|^)#/i,
            /;[\s\S]*--/i,
            /\/\*[\s\S]*?\*\//i // Multi-line comments
        ];

        return sqlPatterns.some(pattern => pattern.test(value));
    };

    // Check request body for SQL injection
    const checkObject = (obj: any): boolean => {
        if (!obj) return false;

        // Check each property of the object
        for (const key in obj) {
            const value = obj[key];

            // Skip if not a string
            if (typeof value !== 'string') {
                if (typeof value === 'object' && value !== null) {
                    // Recursively check nested objects
                    if (checkObject(value)) return true;
                }
                continue;
            }

            // Check for SQL injection in string
            if (hasSqlInjection(value)) {
                return true;
            }
        }

        return false;
    };

    // Check body, query params, and route params
    const hasInjection =
        checkObject(req.body) ||
        checkObject(req.query) ||
        checkObject(req.params);

    if (hasInjection) {
        // Log the attack attempt
        logger.warn(`Potential SQL injection attempt blocked:`, {
            ip: req.ip,
            path: req.path,
            method: req.method,
            body: JSON.stringify(req.body),
            query: JSON.stringify(req.query),
            params: JSON.stringify(req.params),
            userId: req.user?.id
        });

        return next(new AppError('Invalid input detected', 400));
    }

    next();
};

/**
 * XSS protection middleware
 */
export const preventXss = (req: Request, res: Response, next: NextFunction) => {
    // Function to check for XSS patterns
    const hasXssAttack = (value: string): boolean => {
        // XSS attack pattern regex
        const xssPatterns = [
            /<script[\s\S]*?>[\s\S]*?<\/script>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/i,
            /<embed[\s\S]*?>[\s\S]*?<\/embed>/i,
            /<img[\s\S]*?onerror[\s\S]*?>/i
        ];

        return xssPatterns.some(pattern => pattern.test(value));
    };

    // Check request body for XSS attacks
    const checkObject = (obj: any): boolean => {
        if (!obj) return false;

        for (const key in obj) {
            const value = obj[key];

            // Skip if not a string
            if (typeof value !== 'string') {
                if (typeof value === 'object' && value !== null) {
                    // Recursively check nested objects
                    if (checkObject(value)) return true;
                }
                continue;
            }

            // Check for XSS in string
            if (hasXssAttack(value)) {
                return true;
            }
        }

        return false;
    };

    // Check body, query params, and route params
    const hasXss =
        checkObject(req.body) ||
        checkObject(req.query) ||
        checkObject(req.params);

    if (hasXss) {
        // Log the attack attempt
        logger.warn(`Potential XSS attack blocked:`, {
            ip: req.ip,
            path: req.path,
            method: req.method,
            body: JSON.stringify(req.body),
            query: JSON.stringify(req.query),
            params: JSON.stringify(req.params),
            userId: req.user?.id
        });

        return next(new AppError('Invalid input detected', 400));
    }

    next();
};

/**
 * Middleware to prevent open redirect vulnerabilities
 * 
 * Instead of overriding res.redirect, this checks req.query for redirect URLs and validates them.
 * This middleware should be placed before any routes that use redirects.
 */
export const preventOpenRedirect = (req: Request, res: Response, next: NextFunction) => {
    // Check for common redirect query parameters
    const redirectParams = ['redirect', 'redirect_to', 'redirectTo', 'url', 'return_to', 'returnTo'];

    // Get allowed domains from environment variables
    const allowedDomains = [
        process.env.FRONTEND_URL || 'http://localhost:3000'
    ];

    // Function to check if a URL is safe
    const isSafeUrl = (url: string): boolean => {
        // Check if URL is relative (starts with /) or is an allowed domain
        if (!url || typeof url !== 'string') return false;

        const isRelative = url.startsWith('/');
        const isAllowedDomain = allowedDomains.some(domain => url.startsWith(domain));

        return isRelative || isAllowedDomain;
    };

    // Check all potential redirect parameters in query
    for (const param of redirectParams) {
        if (req.query[param] && !isSafeUrl(req.query[param] as string)) {
            // Log the blocked redirect attempt
            logger.warn(`Open redirect attempt blocked:`, {
                url: req.query[param],
                ip: req.ip,
                path: req.path,
                method: req.method,
                userId: req.user?.id
            });

            // Remove the unsafe redirect parameter
            delete req.query[param];
        }
    }

    next();
}; 