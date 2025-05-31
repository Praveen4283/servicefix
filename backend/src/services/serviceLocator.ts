/**
 * Service Locator Pattern implementation
 * This provides a central registry for services and reduces direct dependencies
 */

// Type for any service
type Service = any;

// Service registry
const services: Record<string, Service> = {};

/**
 * Register a service in the locator
 * @param name Service name
 * @param instance Service instance
 */
export const register = (name: string, instance: Service): void => {
  services[name] = instance;
};

/**
 * Get a service from the locator
 * @param name Service name
 * @returns Service instance
 * @throws Error if service not found
 */
export const get = <T extends Service>(name: string): T => {
  if (!services[name]) {
    throw new Error(`Service "${name}" not registered in service locator`);
  }
  return services[name] as T;
};

/**
 * Check if a service is registered
 * @param name Service name
 * @returns True if service exists
 */
export const has = (name: string): boolean => {
  return !!services[name];
};

/**
 * Remove a service from the locator
 * @param name Service name
 */
export const remove = (name: string): void => {
  delete services[name];
};

/**
 * Clear all services from the locator
 */
export const clear = (): void => {
  Object.keys(services).forEach(key => {
    delete services[key];
  });
};

export default {
  register,
  get,
  has,
  remove,
  clear,
}; 