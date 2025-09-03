/**
 * Constants for authenticator lifecycle management
 */

/**
 * How long an authenticator is valid before it expires (in milliseconds)
 * Default: 7 days
 * For testing: Use smaller values like 5 * 60 * 1000 (5 minutes)
 */
export const AUTHENTICATOR_EXPIRATION_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
/**
 * How long before expiration should we attempt to renew the authenticator (in milliseconds)
 * Default: 2 days before expiration
 * For testing: Use smaller values like 2 * 60 * 1000 (2 minutes)
 */
export const AUTHENTICATOR_RENEWAL_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

/**
 * Example configurations for testing:
 *
 * Quick testing (5 minute expiration, 2 minute renewal window):
 * export const AUTHENTICATOR_EXPIRATION_TIME_MS = 5 * 60 * 1000;
 * export const AUTHENTICATOR_RENEWAL_WINDOW_MS = 2 * 60 * 1000;
 *
 * Medium testing (1 hour expiration, 15 minute renewal window):
 * export const AUTHENTICATOR_EXPIRATION_TIME_MS = 60 * 60 * 1000;
 * export const AUTHENTICATOR_RENEWAL_WINDOW_MS = 15 * 60 * 1000;
 *
 * Aggressive testing (30 seconds expiration, 10 second renewal window):
 * export const AUTHENTICATOR_EXPIRATION_TIME_MS = 30 * 1000;
 * export const AUTHENTICATOR_RENEWAL_WINDOW_MS = 10 * 1000;
 */
