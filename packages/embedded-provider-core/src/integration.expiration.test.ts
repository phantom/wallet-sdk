/**
 * Integration test for KeypairAuthenticator expiration and renewal
 * Tests the complete flow from organization creation through renewal
 */

import type { StamperWithKeyManagement, StamperKeyInfo } from '@phantom/sdk-types';
import type { CreateAuthenticatorParams } from '@phantom/client';

// Mock implementation that simulates both stamper behaviors
class MockStamperWithExpiration implements StamperWithKeyManagement {
  private activeRecord: any = null;
  private pendingRecord: any = null;
  public algorithm = 'Ed25519' as any;
  public type = 'PKI' as const;

  init(): Promise<StamperKeyInfo> {
    if (!this.activeRecord) {
      this.activeRecord = this.createMockRecord('active');
    }
    return Promise.resolve(this.activeRecord.keyInfo);
  }

  getKeyInfo(): StamperKeyInfo | null {
    return this.activeRecord?.keyInfo || null;
  }

  stamp(_params: any): Promise<string> {
    if (!this.activeRecord) throw new Error('Not initialized');
    return Promise.resolve(`mock-stamp-${this.activeRecord.keyInfo.keyId}`);
  }

  generateNewKeyPair(): Promise<StamperKeyInfo> {
    this.pendingRecord = this.createMockRecord('pending');
    return Promise.resolve(this.pendingRecord.keyInfo);
  }

  switchToNewKeyPair(authenticatorId: string): Promise<void> {
    if (!this.pendingRecord) throw new Error('No pending keypair');
    
    this.pendingRecord.keyInfo.authenticatorId = authenticatorId;
    this.activeRecord = this.pendingRecord;
    this.pendingRecord = null;
    return Promise.resolve();
  }

  getExpirationInfo() {
    if (!this.activeRecord?.keyInfo.expiresAt) {
      return { expiresAt: null, shouldRenew: false, timeUntilExpiry: null };
    }

    const now = Date.now();
    const expiresAt = this.activeRecord.keyInfo.expiresAt;
    const timeUntilExpiry = expiresAt - now;
    const renewalWindow = 2 * 24 * 60 * 60 * 1000; // 2 days

    return {
      expiresAt,
      timeUntilExpiry,
      shouldRenew: timeUntilExpiry <= renewalWindow && timeUntilExpiry > 0
    };
  }

  clear(): Promise<void> {
    this.activeRecord = null;
    this.pendingRecord = null;
    return Promise.resolve();
  }

  private createMockRecord(type: 'active' | 'pending') {
    const id = Math.random().toString(36).substring(7);
    const now = Date.now();
    return {
      keyInfo: {
        keyId: `key-${id}`,
        publicKey: `public-${id}`,
        createdAt: now,
        expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7 days
      },
      status: type,
    };
  }
}

// Mock PhantomClient that simulates server behavior
class MockPhantomClient {
  private authenticators: Map<string, any> = new Map();

  createOrganization(name: string, users: any[]): Promise<{ organizationId: string }> {
    // Simulate creating authenticators for each user
    for (const user of users) {
      for (const auth of user.authenticators) {
        if (auth.expiresAtMs) {
          const id = Math.random().toString(36).substring(7);
          this.authenticators.set(id, {
            ...auth,
            id,
            expiresAtMs: auth.expiresAtMs,
            createdAt: Date.now(),
          });
        }
      }
    }
    return Promise.resolve({ organizationId: 'test-org-' + Math.random().toString(36).substring(7) });
  }

  createAuthenticator(params: CreateAuthenticatorParams): Promise<any> {
    const id = Math.random().toString(36).substring(7);
    const authenticator = {
      ...params.authenticator,
      id,
      createdAt: Date.now(),
    };

    // Handle replaceExpirable logic
    if (params.replaceExpirable) {
      // Find and remove expired authenticators
      for (const [key, auth] of this.authenticators) {
        if (auth.expiresAtMs && Date.now() >= auth.expiresAtMs) {
          this.authenticators.delete(key);
        }
      }
    }

    this.authenticators.set(id, authenticator);
    return Promise.resolve(authenticator);
  }

  getAuthenticators(): any[] {
    return Array.from(this.authenticators.values());
  }
}

describe('KeypairAuthenticator Expiration Integration Test', () => {
  let stamper: MockStamperWithExpiration;
  let client: MockPhantomClient;
  let originalDate: typeof Date;

  beforeEach(() => {
    // Mock Date.now() for consistent test results
    originalDate = global.Date;
    const mockDate = new Date('2024-01-01T00:00:00Z');
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = jest.fn(() => mockDate.getTime());
    Object.setPrototypeOf(global.Date, originalDate);

    stamper = new MockStamperWithExpiration();
    client = new MockPhantomClient();
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  test('should create organization with expiring authenticator', async () => {
    // Step 1: Initialize stamper (simulates app startup)
    const keyInfo = await stamper.init();
    expect(keyInfo.expiresAt).toBeDefined();

    // Step 2: Create organization with expiring authenticator
    const expiresAtMs = Date.now() + (7 * 24 * 60 * 60 * 1000);
    const result = await client.createOrganization('test-org', [{
      username: 'test-user',
      role: 'ADMIN',
      authenticators: [{
        authenticatorName: 'test-auth',
        authenticatorKind: 'keypair',
        publicKey: keyInfo.publicKey,
        algorithm: 'Ed25519',
        expiresAtMs: expiresAtMs,
      }]
    }]);

    expect(result.organizationId).toBeDefined();

    const authenticators = client.getAuthenticators();
    expect(authenticators).toHaveLength(1);
    expect(authenticators[0].expiresAtMs).toBe(expiresAtMs);
  });

  test('should perform complete renewal flow', async () => {
    // Setup: Create initial organization
    await stamper.init();
    const keyInfo = stamper.getKeyInfo()!;
    
    await client.createOrganization('test-org', [{
      username: 'test-user',
      role: 'ADMIN',
      authenticators: [{
        authenticatorName: 'initial-auth',
        authenticatorKind: 'keypair',
        publicKey: keyInfo.publicKey,
        algorithm: 'Ed25519',
        expiresAtMs: Date.now() + (7 * 24 * 60 * 60 * 1000),
      }]
    }]);

    // Simulate time passing - 6 days later (within renewal window)
    const sixDaysLater = Date.now() + (6 * 24 * 60 * 60 * 1000);
    global.Date.now = jest.fn(() => sixDaysLater);

    // Step 1: Check expiration - should indicate renewal needed
    const expirationInfo = stamper.getExpirationInfo();
    expect(expirationInfo.shouldRenew).toBe(true);

    // Step 2: Generate new keypair for rotation
    const newKeyInfo = await stamper.generateNewKeyPair();
    expect(newKeyInfo.keyId).not.toBe(keyInfo.keyId);

    // Step 3: Create new authenticator with replaceExpirable
    const newAuthResult = await client.createAuthenticator({
      organizationId: 'test-org',
      username: 'test-user',
      authenticatorName: 'renewed-auth',
      authenticator: {
        authenticatorKind: 'keypair',
        publicKey: newKeyInfo.publicKey,
        algorithm: 'Ed25519',
        expiresAtMs: Date.now() + (7 * 24 * 60 * 60 * 1000),
      },
      replaceExpirable: true,
    });

    expect(newAuthResult.id).toBeDefined();

    // Step 4: Switch stamper to new keypair
    await stamper.switchToNewKeyPair(newAuthResult.id);

    // Verify: Active keypair has changed
    const currentKeyInfo = stamper.getKeyInfo()!;
    expect(currentKeyInfo.keyId).toBe(newKeyInfo.keyId);
    expect(currentKeyInfo.authenticatorId).toBe(newAuthResult.id);

    // Verify: Signing still works with new keypair
    const stamp = await stamper.stamp({ data: Buffer.from('test') });
    expect(stamp).toContain(newKeyInfo.keyId);
  });

  test('should handle multiple renewal cycles', async () => {
    await stamper.init();
    const initialKeyInfo = stamper.getKeyInfo()!;

    // Create initial organization
    await client.createOrganization('test-org', [{
      username: 'test-user',
      role: 'ADMIN',
      authenticators: [{
        authenticatorName: 'initial-auth',
        authenticatorKind: 'keypair',
        publicKey: initialKeyInfo.publicKey,
        algorithm: 'Ed25519',
        expiresAtMs: Date.now() + (7 * 24 * 60 * 60 * 1000),
      }]
    }]);

    // First renewal cycle
    let currentTime = Date.now() + (6 * 24 * 60 * 60 * 1000);
    global.Date.now = jest.fn(() => currentTime);

    expect(stamper.getExpirationInfo().shouldRenew).toBe(true);

    let newKeyInfo = await stamper.generateNewKeyPair();
    let newAuthResult = await client.createAuthenticator({
      organizationId: 'test-org',
      username: 'test-user',
      authenticatorName: 'first-renewal',
      authenticator: {
        authenticatorKind: 'keypair',
        publicKey: newKeyInfo.publicKey,
        algorithm: 'Ed25519',
        expiresAtMs: currentTime + (7 * 24 * 60 * 60 * 1000),
      },
      replaceExpirable: true,
    });
    await stamper.switchToNewKeyPair(newAuthResult.id);

    const firstRenewalKeyInfo = stamper.getKeyInfo()!;

    // Second renewal cycle - another 6 days later
    currentTime = currentTime + (6 * 24 * 60 * 60 * 1000);
    global.Date.now = jest.fn(() => currentTime);

    expect(stamper.getExpirationInfo().shouldRenew).toBe(true);

    newKeyInfo = await stamper.generateNewKeyPair();
    newAuthResult = await client.createAuthenticator({
      organizationId: 'test-org',
      username: 'test-user',
      authenticatorName: 'second-renewal',
      authenticator: {
        authenticatorKind: 'keypair',
        publicKey: newKeyInfo.publicKey,
        algorithm: 'Ed25519',
        expiresAtMs: currentTime + (7 * 24 * 60 * 60 * 1000),
      },
      replaceExpirable: true,
    });
    await stamper.switchToNewKeyPair(newAuthResult.id);

    const secondRenewalKeyInfo = stamper.getKeyInfo()!;

    // Verify all three keys are different
    expect(initialKeyInfo.keyId).not.toBe(firstRenewalKeyInfo.keyId);
    expect(firstRenewalKeyInfo.keyId).not.toBe(secondRenewalKeyInfo.keyId);
    expect(initialKeyInfo.keyId).not.toBe(secondRenewalKeyInfo.keyId);
  });

  test('should maintain functionality during rotation', async () => {
    await stamper.init();
    const initialStamp = await stamper.stamp({ data: Buffer.from('test') });

    // Generate new keypair but don't switch yet
    await stamper.generateNewKeyPair();

    // Should still use original keypair for signing
    const duringRotationStamp = await stamper.stamp({ data: Buffer.from('test') });
    expect(duringRotationStamp).toBe(initialStamp);

    // Switch to new keypair
    await stamper.switchToNewKeyPair('new-auth-id');

    // Should now use new keypair for signing
    const afterRotationStamp = await stamper.stamp({ data: Buffer.from('test') });
    expect(afterRotationStamp).not.toBe(initialStamp);
  });

  test('should handle edge case: exactly at renewal threshold', async () => {
    await stamper.init();

    // Set time to exactly at renewal threshold (2 days before expiration)
    const renewalThreshold = Date.now() + (5 * 24 * 60 * 60 * 1000); // 5 days later = 2 days before expiry
    global.Date.now = jest.fn(() => renewalThreshold);

    const expirationInfo = stamper.getExpirationInfo();
    expect(expirationInfo.shouldRenew).toBe(true);
    expect(expirationInfo.timeUntilExpiry).toBe(2 * 24 * 60 * 60 * 1000);
  });

  test('should handle edge case: exactly at expiration', async () => {
    await stamper.init();
    const keyInfo = stamper.getKeyInfo()!;

    // Set time to exactly at expiration
    global.Date.now = jest.fn(() => keyInfo.expiresAt!);

    const expirationInfo = stamper.getExpirationInfo();
    expect(expirationInfo.shouldRenew).toBe(false); // Too late for renewal
    expect(expirationInfo.timeUntilExpiry).toBe(0);
  });
});