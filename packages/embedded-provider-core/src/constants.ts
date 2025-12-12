import type { EmbeddedProviderAuthType } from "./types";
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

export const EMBEDDED_PROVIDER_AUTH_TYPES: EmbeddedProviderAuthType[] = ["google", "apple", "phantom"];
