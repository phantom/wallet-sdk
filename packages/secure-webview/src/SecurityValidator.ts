import type { SecurityConfig, SecureMessage, ValidationResult } from './types';

export class SecurityValidator {
  private config: SecurityConfig;
  private messageCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  public validateOrigin(url: string): boolean {
    if (!this.config.allowedOrigins.length) {
      return true; // No restrictions if no origins specified
    }

    try {
      const urlObj = new URL(url);
      const origin = `${urlObj.protocol}//${urlObj.host}`;

      return this.config.allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          // Handle wildcard matching
          const pattern = allowedOrigin
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return origin === allowedOrigin;
      });
    } catch (error) {
      if (this.config.enableLogging) {
        // Invalid URL for origin validation
      }
      return false;
    }
  }

  public validateMessage(message: SecureMessage): ValidationResult {
    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.maxMessageSize) {
      return {
        valid: false,
        error: `Message size exceeds limit: ${messageSize} > ${this.config.maxMessageSize}`,
        blocked: true,
        violation: 'MESSAGE_SIZE_EXCEEDED'
      };
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      return {
        valid: false,
        error: 'Message rate limit exceeded',
        blocked: true,
        violation: 'RATE_LIMIT_EXCEEDED'
      };
    }

    // Validate message structure
    if (!this.isValidMessageStructure(message)) {
      return {
        valid: false,
        error: 'Invalid message structure',
        blocked: true,
        violation: 'INVALID_MESSAGE_STRUCTURE'
      };
    }

    // Sanitize message content
    const sanitized = this.sanitizeMessage(message);

    // Check for dangerous content
    if (this.config.blockDangerousAPIs && this.containsDangerousContent(sanitized)) {
      return {
        valid: false,
        error: 'Message contains dangerous content',
        blocked: true,
        violation: 'DANGEROUS_CONTENT_DETECTED'
      };
    }

    // Verify integrity if present
    if (message.integrity && !this.verifyIntegrity(message)) {
      return {
        valid: false,
        error: 'Message integrity verification failed',
        blocked: true,
        violation: 'INTEGRITY_VERIFICATION_FAILED'
      };
    }

    return {
      valid: true,
      sanitized
    };
  }

  public validateCSP(url: string): boolean {
    if (!this.config.strictCSP) {
      return true;
    }

    // Basic CSP validation - check for data: URIs and javascript: URIs
    const lowercaseUrl = url.toLowerCase();
    const dangerousSchemes = ['data:', 'javascript:', 'vbscript:', 'about:'];

    return !dangerousSchemes.some(scheme => lowercaseUrl.startsWith(scheme));
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute

    // Reset counter if time window has passed
    if (now - this.lastResetTime > timeWindow) {
      this.messageCount = 0;
      this.lastResetTime = now;
    }

    this.messageCount++;
    return this.messageCount <= this.config.messageRateLimit;
  }

  private isValidMessageStructure(message: any): message is SecureMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    const required = ['type', 'data', 'timestamp', 'origin'];
    return required.every(field => field in message);
  }

  private sanitizeMessage(message: SecureMessage): SecureMessage {
    const sanitized = { ...message };

    // Sanitize strings to prevent XSS
    if (typeof sanitized.type === 'string') {
      sanitized.type = this.sanitizeString(sanitized.type);
    }

    if (typeof sanitized.origin === 'string') {
      sanitized.origin = this.sanitizeString(sanitized.origin);
    }

    // Deep sanitize data object
    sanitized.data = this.sanitizeData(sanitized.data);

    return sanitized;
  }

  private sanitizeString(str: string): string {
    // Remove dangerous characters and patterns
    return str
      .replace(/[<>"']/g, '') // Remove HTML/XSS characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim()
      .substring(0, 1000); // Limit length
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item)).slice(0, 100); // Limit array size
    }

    if (typeof data === 'object') {
      const sanitizedObj: any = {};
      let propertyCount = 0;

      for (const [key, value] of Object.entries(data)) {
        if (propertyCount >= 50) break; // Limit object properties

        const sanitizedKey = this.sanitizeString(key);
        if (sanitizedKey.length > 0) {
          sanitizedObj[sanitizedKey] = this.sanitizeData(value);
          propertyCount++;
        }
      }

      return sanitizedObj;
    }

    return null; // Unknown type, remove it
  }

  private containsDangerousContent(message: SecureMessage): boolean {
    const jsonString = JSON.stringify(message).toLowerCase();

    const dangerousPatterns = [
      'eval(',
      'function(',
      'constructor',
      'prototype',
      '__proto__',
      'settimeout',
      'setinterval',
      'importscripts',
      'document.cookie',
      'localstorage',
      'sessionstorage',
      'indexeddb',
      'websql',
      'navigator.geolocation',
      'navigator.camera',
      'navigator.microphone'
    ];

    return dangerousPatterns.some(pattern => jsonString.includes(pattern));
  }

  private verifyIntegrity(message: SecureMessage): boolean {
    if (!message.integrity || !message.nonce) {
      return false;
    }

    // Simple integrity check using the nonce
    // In production, you'd use proper HMAC or digital signatures
    const expectedIntegrity = this.calculateIntegrity(message);
    return expectedIntegrity === message.integrity;
  }

  private calculateIntegrity(message: SecureMessage): string {
    // Simplified integrity calculation
    // In production, use proper cryptographic functions
    const content = JSON.stringify({
      type: message.type,
      data: message.data,
      timestamp: message.timestamp,
      nonce: message.nonce
    });

    // Simple hash-like function (use proper crypto in production)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  public generateNonce(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${random}`;
  }

  public createSecureMessage(type: string, data: any): SecureMessage {
    const nonce = this.generateNonce();
    const message: SecureMessage = {
      type,
      data,
      timestamp: Date.now(),
      origin: 'secure-webview',
      nonce,
      encrypted: this.config.enableEncryption
    };

    if (this.config.enableEncryption) {
      message.integrity = this.calculateIntegrity(message);
    }

    return message;
  }
}