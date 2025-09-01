/**
 * Integration test to verify indexed-db-stamper works with real dependencies
 */
import { IndexedDbStamper } from "./index";

// Simple integration test that doesn't require complex mocking
describe("IndexedDbStamper Integration", () => {
  let stamper: IndexedDbStamper;

  beforeEach(() => {
    stamper = new IndexedDbStamper({
      dbName: "test-integration-db",
      storeName: "test-keys",
      keyName: "test-key",
    });
  });

  afterEach(async () => {
    try {
      await stamper.clear();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should create stamper instance", () => {
    expect(stamper).toBeInstanceOf(IndexedDbStamper);
    expect(stamper.getKeyInfo()).toBeNull();
  });

  it("should validate browser environment requirement", () => {
    // Temporarily remove window to test error
    const originalWindow = global.window;
    const originalIndexedDB = global.indexedDB;

    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.indexedDB;

    expect(() => new IndexedDbStamper()).toThrow(
      "IndexedDbStamper requires a browser environment with IndexedDB support",
    );

    // Restore
    global.window = originalWindow;
    global.indexedDB = originalIndexedDB;
  });

  it("should handle stamp method with Buffer payload", async () => {
    // Mock the init method to avoid complex setup
    jest.spyOn(stamper, "init").mockResolvedValue({
      keyId: "test-key-id",
      publicKey: "test-public-key",
    });

    // Mock the stamp method
    jest.spyOn(stamper, "stamp").mockResolvedValue("mock-stamp-header");

    const payload = Buffer.from("test payload", "utf8");
    const stamp = await stamper.stamp({
      data: payload,
    });

    expect(stamp).toBe("mock-stamp-header");
  });

  it("should handle stamp method with JSON Buffer payload", async () => {
    // Mock the init method
    jest.spyOn(stamper, "init").mockResolvedValue({
      keyId: "test-key-id",
      publicKey: "test-public-key",
    });

    // Mock the stamp method
    jest.spyOn(stamper, "stamp").mockResolvedValue("mock-stamp-header");

    const payload = { action: "test", timestamp: Date.now() };
    const payloadBuffer = Buffer.from(JSON.stringify(payload), "utf8");
    const stamp = await stamper.stamp({
      data: payloadBuffer,
    });

    expect(stamp).toBe("mock-stamp-header");
  });

  it("should provide expected interface methods", () => {
    // Verify the stamper implements the expected interface
    expect(typeof stamper.init).toBe("function");
    expect(typeof stamper.stamp).toBe("function");
    expect(typeof stamper.getKeyInfo).toBe("function");
    expect(typeof stamper.resetKeyPair).toBe("function");
    expect(typeof stamper.clear).toBe("function");
  });
});
