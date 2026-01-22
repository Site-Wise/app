/**
 * PocketBase Module Index
 *
 * This is the main entry point for the PocketBase module.
 * It re-exports all types, services, and utilities.
 */

// Export PocketBase client
export { pb } from './client';

// Export context management functions
export {
  getCurrentSiteId,
  setCurrentSiteId,
  getCurrentUserRole,
  setCurrentUserRole
} from './context';

// Export all types
export * from './types';

// Export services
export * from './services';
