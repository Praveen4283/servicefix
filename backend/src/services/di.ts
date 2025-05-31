/**
 * Simple Dependency Injection Container
 * This provides a more explicit approach to managing dependencies
 * compared to the service locator pattern.
 */

import { logger } from '../utils/logger';

// Type for service factories
type ServiceFactory<T> = () => T;

// DI Container class
class DIContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, ServiceFactory<any>>();
  private singletons = new Set<string>();

  /**
   * Register a service factory
   * @param name Service name
   * @param factory Factory function that creates the service
   * @param singleton Whether to cache the instance (true) or create new instance each time (false)
   */
  register<T>(name: string, factory: ServiceFactory<T>, singleton: boolean = true): void {
    this.factories.set(name, factory);
    
    if (singleton) {
      this.singletons.add(name);
    } else {
      // Ensure we don't have a cached instance for non-singletons
      this.services.delete(name);
    }
    
    logger.debug(`Registered service: ${name}, singleton: ${singleton}`);
  }

  /**
   * Get a service instance
   * @param name Service name
   * @returns Service instance
   */
  get<T>(name: string): T {
    // For singletons, check if we have a cached instance
    if (this.singletons.has(name) && this.services.has(name)) {
      return this.services.get(name) as T;
    }
    
    // Get the factory
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service not registered: ${name}`);
    }
    
    // Create the service instance
    const instance = factory();
    
    // Cache the instance if it's a singleton
    if (this.singletons.has(name)) {
      this.services.set(name, instance);
    }
    
    return instance as T;
  }

  /**
   * Check if a service is registered
   * @param name Service name
   * @returns True if the service is registered
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
    logger.debug('Cleared all services');
  }
}

// Export a singleton instance of the container
export const container = new DIContainer();

// Helper function to get a service
export function getService<T>(name: string): T {
  return container.get<T>(name);
}

// Export default container for convenience
export default container; 