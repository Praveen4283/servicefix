import { Router } from 'express';

/**
 * Creates versioned routes while maintaining backward compatibility
 * @param router Express router to register routes on
 * @param moduleName Name of the module (e.g., 'auth', 'users')
 * @param moduleRouter Router with the actual routes
 */
export const registerVersionedRoutes = (
  router: Router,
  moduleName: string,
  moduleRouter: Router
): void => {
  // Register the versioned route
  router.use(`/v1/${moduleName}`, moduleRouter);

  // For backward compatibility, also register the non-versioned route
  router.use(`/${moduleName}`, moduleRouter);
};

export default registerVersionedRoutes; 