import { BrowserStorage } from "./adapters/storage";

describe("BrowserStorage", () => {
  let storage: BrowserStorage;

  beforeEach(() => {
    storage = new BrowserStorage();
    // Clear IndexedDB
    indexedDB = new IDBFactory();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getDB", () => {
    it("should create and return database", async () => {
      const db = await storage.getDB();
      expect(db).toBeDefined();
      expect(db.name).toBe("phantom-browser-sdk");
      expect(db.version).toBe(1);
    });

    it("should create object store on upgrade", async () => {
      const db = await storage.getDB();
      expect(db.objectStoreNames.contains("sessions")).toBe(true);
    });
  });

  describe("session management", () => {
    it("should return null when no session exists", async () => {
      const session = await storage.getSession();
      expect(session).toBeNull();
    });

    it("should save and retrieve session", async () => {
      const testSession = {
        sessionId: "session-123",
        walletId: "wallet-123",
        organizationId: "org-456",
        keypair: {
          publicKey: "publicKey123",
          secretKey: "secretKey456",
        },
        authProvider: "test-provider",
        userInfo: {},
        status: "completed" as const,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      await storage.saveSession(testSession);
      const retrievedSession = await storage.getSession();

      expect(retrievedSession).toEqual(testSession);
    });

    it("should update existing session", async () => {
      const session1 = {
        sessionId: "session-123",
        walletId: "wallet-123",
        organizationId: "org-456",
        keypair: {
          publicKey: "publicKey123",
          secretKey: "secretKey456",
        },
        authProvider: "test-provider",
        userInfo: {},
        status: "completed" as const,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      const session2 = {
        sessionId: "session-789",
        walletId: "wallet-789",
        organizationId: "org-999",
        keypair: {
          publicKey: "publicKey789",
          secretKey: "secretKey999",
        },
        authProvider: "test-provider-2",
        userInfo: {},
        status: "completed" as const,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      await storage.saveSession(session1);
      await storage.saveSession(session2);
      const retrievedSession = await storage.getSession();

      expect(retrievedSession).toEqual(session2);
    });

    it("should clear session", async () => {
      const testSession = {
        sessionId: "session-123",
        walletId: "wallet-123",
        organizationId: "org-456",
        keypair: {
          publicKey: "publicKey123",
          secretKey: "secretKey456",
        },
        authProvider: "test-provider",
        userInfo: {},
        status: "completed" as const,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      await storage.saveSession(testSession);
      await storage.clearSession();
      const session = await storage.getSession();

      expect(session).toBeNull();
    });
  });

  describe("concurrent operations", () => {
    it("should handle concurrent session saves", async () => {
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        sessionId: `session-${i}`,
        walletId: `wallet-${i}`,
        organizationId: `org-${i}`,
        keypair: {
          publicKey: `publicKey${i}`,
          secretKey: `secretKey${i}`,
        },
        authProvider: "test-provider",
        userInfo: {},
        status: "completed" as const,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      }));

      // Save all sessions concurrently
      await Promise.all(sessions.map(session => storage.saveSession(session)));

      // The last session should be the one stored
      const retrievedSession = await storage.getSession();
      expect(retrievedSession).toBeDefined();
      expect(
        sessions.some(
          s => s.walletId === retrievedSession!.walletId && s.organizationId === retrievedSession!.organizationId,
        ),
      ).toBe(true);
    });

    it("should handle concurrent reads", async () => {
      const testSession = {
        sessionId: "session-123",
        walletId: "wallet-123",
        organizationId: "org-456",
        keypair: {
          publicKey: "publicKey123",
          secretKey: "secretKey456",
        },
        authProvider: "test-provider",
        userInfo: {},
        status: "completed" as const,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      await storage.saveSession(testSession);

      // Read session multiple times concurrently
      const results = await Promise.all(Array.from({ length: 10 }, () => storage.getSession()));

      results.forEach(result => {
        expect(result).toEqual(testSession);
      });
    });
  });
});
