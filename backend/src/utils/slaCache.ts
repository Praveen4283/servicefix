/**
 * Simple in-memory cache for SLA calculations
 * Reduces database load by caching SLA status for tickets
 */

import { TIME } from '../constants/app.constants';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class SLACache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private cacheDuration: number = TIME.SLA_CACHE_DURATION_MS;

    /**
     * Get cached value if still valid
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cached value with expiration
     */
    set<T>(key: string, data: T, customDuration?: number): void {
        const duration = customDuration || this.cacheDuration;
        const expiresAt = Date.now() + duration;

        this.cache.set(key, { data, expiresAt });
    }

    /**
     * Invalidate specific cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalidate all cache entries for a ticket
     */
    invalidateTicket(ticketId: number): void {
        const prefix = `ticket:${ticketId}:`;
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let validCount = 0;
        let expiredCount = 0;

        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) {
                expiredCount++;
            } else {
                validCount++;
            }
        }

        return {
            total: this.cache.size,
            valid: validCount,
            expired: expiredCount
        };
    }

    /**
     * Clean up expired entries (call periodically)
     */
    cleanup(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

// Export singleton instance
export const slaCache = new SLACache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const cleaned = slaCache.cleanup();
}, TIME.SLA_CACHE_DURATION_MS);

// Note: We import logger after exporting slaCache to avoid circular dependency
import { logger } from './logger';

// Update the cleanup interval to use logger
const cleanupInterval = setInterval(() => {
    const cleaned = slaCache.cleanup();
    if (cleaned > 0) {
        logger.info(`[SLA Cache] Cleaned up ${cleaned} expired entries`);
    }
}, TIME.SLA_CACHE_DURATION_MS);

// Clear interval on module unload (for clean shutdown)
if (typeof process !== 'undefined') {
    process.on('beforeExit', () => {
        clearInterval(cleanupInterval);
    });
}
