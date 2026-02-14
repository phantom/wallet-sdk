import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { SessionStorage } from "./storage";
import type { SessionData } from "./types";

describe("SessionStorage", () => {
  let tempDir: string;
  let storage: SessionStorage;

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "phantom-mcp-test-"));
    storage = new SessionStorage(tempDir);
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createMockSession = (): SessionData => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return {
      walletId: "wallet-123",
      organizationId: "org-456",
      authUserId: "user-789",
      stamperKeys: {
        publicKey: "public-key-data",
        secretKey: "secret-key-data",
      },
      createdAt: nowSeconds,
      updatedAt: nowSeconds,
    };
  };

  describe("save and load", () => {
    it("should save and load session data", () => {
      const session = createMockSession();
      storage.save(session);

      const loaded = storage.load();
      expect(loaded).toEqual(session);
    });

    it("should return null when no session file exists", () => {
      const loaded = storage.load();
      expect(loaded).toBeNull();
    });

    it("should overwrite existing session data", () => {
      const session1 = createMockSession();
      storage.save(session1);

      const session2 = createMockSession();
      session2.walletId = "wallet-updated";
      storage.save(session2);

      const loaded = storage.load();
      expect(loaded?.walletId).toBe("wallet-updated");
    });

    it("should return null for corrupted session file", () => {
      // Create directory first
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { mode: 0o700, recursive: true });
      }

      // Write invalid JSON
      const sessionFile = path.join(tempDir, "session.json");
      fs.writeFileSync(sessionFile, "invalid json {{{", { mode: 0o600 });

      const loaded = storage.load();
      expect(loaded).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete existing session file", () => {
      const session = createMockSession();
      storage.save(session);

      const sessionFile = path.join(tempDir, "session.json");
      expect(fs.existsSync(sessionFile)).toBe(true);

      storage.delete();
      expect(fs.existsSync(sessionFile)).toBe(false);
    });

    it("should not throw when deleting non-existent session", () => {
      expect(() => storage.delete()).not.toThrow();
    });

    it("should return null after deletion", () => {
      const session = createMockSession();
      storage.save(session);

      storage.delete();
      const loaded = storage.load();
      expect(loaded).toBeNull();
    });
  });

  describe("secure permissions", () => {
    it("should create session directory with 0o700 permissions", () => {
      if (process.platform === "win32") {
        return; // Skip on Windows - POSIX permissions not applicable
      }
      const session = createMockSession();
      storage.save(session);

      const stats = fs.statSync(tempDir);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o700);
    });

    it("should create session file with 0o600 permissions", () => {
      if (process.platform === "win32") {
        return; // Skip on Windows - POSIX permissions not applicable
      }
      const session = createMockSession();
      storage.save(session);

      const sessionFile = path.join(tempDir, "session.json");
      const stats = fs.statSync(sessionFile);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it("should fix permissions on existing directory", () => {
      if (process.platform === "win32") {
        return; // Skip on Windows - POSIX permissions not applicable
      }
      // Create directory with wrong permissions
      fs.mkdirSync(tempDir, { mode: 0o755, recursive: true });

      const session = createMockSession();
      storage.save(session);

      const stats = fs.statSync(tempDir);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o700);
    });
  });

  describe("isExpired", () => {
    it("should return false for SSO sessions (stamper keys don't expire)", () => {
      const session = createMockSession();
      const expired = storage.isExpired(session);
      expect(expired).toBe(false);
    });
  });

  describe("default session directory", () => {
    it("should use ~/.phantom-mcp by default", () => {
      const defaultStorage = new SessionStorage();
      const expectedPath = path.join(os.homedir(), ".phantom-mcp");

      // Access private field for testing
      const actualPath = (defaultStorage as any).sessionDir;
      expect(actualPath).toBe(expectedPath);
    });
  });
});
