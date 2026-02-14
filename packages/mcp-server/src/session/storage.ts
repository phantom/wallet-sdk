import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { SessionData } from "./types.js";

/**
 * SessionStorage manages secure filesystem storage for OAuth sessions.
 * - Sessions are stored in ~/.phantom-mcp/ by default
 * - Directory permissions are 0o700 (user-only rwx)
 * - File permissions are 0o600 (user-only rw)
 */
export class SessionStorage {
  private readonly sessionDir: string;
  private readonly sessionFile: string;

  constructor(sessionDir?: string) {
    this.sessionDir = sessionDir || path.join(os.homedir(), ".phantom-mcp");
    this.sessionFile = path.join(this.sessionDir, "session.json");
  }

  /**
   * Ensures session directory exists with secure permissions (0o700)
   */
  private ensureSessionDir(): void {
    try {
      fs.mkdirSync(this.sessionDir, { mode: 0o700, recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "EEXIST") {
        throw error;
      }
    }

    try {
      // Ensure existing directory has correct permissions
      fs.chmodSync(this.sessionDir, 0o700);
    } catch {
      // Ignore chmod errors on Windows
    }
  }

  /**
   * Loads session data from disk
   * @returns SessionData if exists and valid, null otherwise
   */
  load(): SessionData | null {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        return null;
      }

      const data = fs.readFileSync(this.sessionFile, "utf-8");
      const session = JSON.parse(data) as Partial<SessionData>;
      if (
        typeof session.walletId !== "string" ||
        typeof session.organizationId !== "string" ||
        typeof session.authUserId !== "string" ||
        typeof session.stamperKeys?.publicKey !== "string" ||
        typeof session.stamperKeys?.secretKey !== "string" ||
        typeof session.createdAt !== "number" ||
        typeof session.updatedAt !== "number"
      ) {
        return null;
      }

      return session as SessionData;
    } catch (error) {
      // If file is corrupted or unreadable, treat as no session
      return null;
    }
  }

  /**
   * Saves session data to disk with secure permissions (0o600)
   * @param session Session data to save
   */
  save(session: SessionData): void {
    this.ensureSessionDir();

    const data = JSON.stringify(session, null, 2);
    fs.writeFileSync(this.sessionFile, data, { mode: 0o600 });
  }

  /**
   * Deletes the session file from disk
   */
  delete(): void {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }
    } catch (error) {
      // If file doesn't exist or can't be deleted, ignore
    }
  }

  /**
   * Checks if a session is expired
   * @param session Session data to check
   * @returns false - SSO sessions don't expire (stamper keys are permanent)
   */
  isExpired(_session: SessionData): boolean {
    // SSO sessions use stamper keys which don't expire
    // TODO: Implement session refresh if needed
    return false;
  }
}
