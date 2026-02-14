import { Logger, logger } from "./logger";

describe("Logger", () => {
  let stderrWriteSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Mock stderr and stdout
    stderrWriteSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);
    stdoutWriteSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Reset env vars
    delete process.env.DEBUG;
    delete process.env.PHANTOM_MCP_DEBUG;
  });

  afterEach(() => {
    // Restore mocks
    stderrWriteSpy.mockRestore();
    stdoutWriteSpy.mockRestore();

    // Restore env vars
    process.env = { ...originalEnv };
  });

  describe("constructor", () => {
    it('should use default context "MCP" when no context provided', () => {
      const testLogger = new Logger();
      testLogger.info("test");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[MCP]");
    });

    it("should use provided context", () => {
      const testLogger = new Logger("CustomContext");
      testLogger.info("test");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[CustomContext]");
    });
  });

  describe("log output", () => {
    it("should write to stderr, NOT stdout", () => {
      const testLogger = new Logger();
      testLogger.info("test message");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it("should include timestamp in ISO format", () => {
      const testLogger = new Logger();
      testLogger.info("test");

      const output = stderrWriteSpy.mock.calls[0][0] as string;
      // Check for ISO timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it("should include log level", () => {
      const testLogger = new Logger();
      testLogger.info("test");

      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[INFO]");
    });

    it("should include context", () => {
      const testLogger = new Logger("TestContext");
      testLogger.info("test");

      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[TestContext]");
    });

    it("should include message", () => {
      const testLogger = new Logger();
      testLogger.info("test message");

      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("test message");
    });

    it("should end with newline", () => {
      const testLogger = new Logger();
      testLogger.info("test");

      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output.endsWith("\n")).toBe(true);
    });

    it("should format log message correctly", () => {
      const testLogger = new Logger("TestContext");
      testLogger.info("test message");

      const output = stderrWriteSpy.mock.calls[0][0] as string;
      // Format: [timestamp] [level] [context] message\n
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] \[TestContext\] test message\n/);
    });
  });

  describe("info()", () => {
    it("should log with INFO level", () => {
      const testLogger = new Logger();
      testLogger.info("info message");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[INFO]");
      expect(output).toContain("info message");
    });
  });

  describe("error()", () => {
    it("should log with ERROR level", () => {
      const testLogger = new Logger();
      testLogger.error("error message");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[ERROR]");
      expect(output).toContain("error message");
    });
  });

  describe("warn()", () => {
    it("should log with WARN level", () => {
      const testLogger = new Logger();
      testLogger.warn("warning message");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[WARN]");
      expect(output).toContain("warning message");
    });
  });

  describe("debug()", () => {
    it("should NOT log when DEBUG env var is not set", () => {
      const testLogger = new Logger();
      testLogger.debug("debug message");

      expect(stderrWriteSpy).not.toHaveBeenCalled();
    });

    it("should log when DEBUG env var is set", () => {
      process.env.DEBUG = "1";

      const testLogger = new Logger();
      testLogger.debug("debug message");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[DEBUG]");
      expect(output).toContain("debug message");
    });

    it("should log when PHANTOM_MCP_DEBUG env var is set", () => {
      process.env.PHANTOM_MCP_DEBUG = "true";

      const testLogger = new Logger();
      testLogger.debug("debug message");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[DEBUG]");
      expect(output).toContain("debug message");
    });

    it("should log when either DEBUG or PHANTOM_MCP_DEBUG is set", () => {
      process.env.DEBUG = "1";
      process.env.PHANTOM_MCP_DEBUG = "true";

      const testLogger = new Logger();
      testLogger.debug("debug message");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[DEBUG]");
    });
  });

  describe("child()", () => {
    it("should create child logger with combined context", () => {
      const parentLogger = new Logger("Parent");
      const childLogger = parentLogger.child("Child");

      childLogger.info("test");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[Parent:Child]");
    });

    it("should support nested child loggers", () => {
      const parentLogger = new Logger("Parent");
      const childLogger = parentLogger.child("Child");
      const grandchildLogger = childLogger.child("Grandchild");

      grandchildLogger.info("test");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[Parent:Child:Grandchild]");
    });

    it("should create independent child loggers", () => {
      const parentLogger = new Logger("Parent");
      const child1 = parentLogger.child("Child1");
      const child2 = parentLogger.child("Child2");

      child1.info("message1");
      child2.info("message2");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(2);
      const output1 = stderrWriteSpy.mock.calls[0][0] as string;
      const output2 = stderrWriteSpy.mock.calls[1][0] as string;

      expect(output1).toContain("[Parent:Child1]");
      expect(output2).toContain("[Parent:Child2]");
    });
  });

  describe("singleton logger", () => {
    it("should export a default logger instance", () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should use default MCP context", () => {
      logger.info("test");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      const output = stderrWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain("[MCP]");
    });
  });

  describe("multiple log calls", () => {
    it("should write multiple independent log lines", () => {
      const testLogger = new Logger();

      testLogger.info("message 1");
      testLogger.warn("message 2");
      testLogger.error("message 3");

      expect(stderrWriteSpy).toHaveBeenCalledTimes(3);

      const output1 = stderrWriteSpy.mock.calls[0][0] as string;
      const output2 = stderrWriteSpy.mock.calls[1][0] as string;
      const output3 = stderrWriteSpy.mock.calls[2][0] as string;

      expect(output1).toContain("[INFO]");
      expect(output1).toContain("message 1");

      expect(output2).toContain("[WARN]");
      expect(output2).toContain("message 2");

      expect(output3).toContain("[ERROR]");
      expect(output3).toContain("message 3");
    });
  });
});
