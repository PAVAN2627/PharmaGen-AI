import logger from '../utils/logger';

/**
 * Firebase has been removed from the project.
 * This file is kept for reference but all Firebase functionality has been stripped.
 * The application now runs in stateless mode without persistent storage.
 */

/**
 * Placeholder - Firebase initialization has been removed
 */
export function initializeFirebase() {
  logger.info('ℹ️ Firebase initialization skipped - application running in stateless mode');
  return null;
}

/**
 * Placeholder - Firestore no longer available
 */
export function getFirestore() {
  logger.warn('⚠️ Firestore access attempted - Firebase has been removed from the application');
  return null;
}

/**
 * Firebase is not available
 */
export function isFirebaseAvailable(): boolean {
  return false;
}

export default null;
