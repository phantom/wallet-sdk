import { SwapperAPIClient } from "../src/api/client";

describe("SwapperAPIClient", () => {
  let client: SwapperAPIClient;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new SwapperAPIClient({
      apiUrl: "https://api.test.com",
    });
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const defaultClient = new SwapperAPIClient();
      expect(defaultClient.getBaseUrl()).toBe("https://api.phantom.app/swap/v2");
    });

    it("should initialize with custom config", () => {
      const customClient = new SwapperAPIClient({
        apiUrl: "https://custom.api.com",
        headers: {
          "X-Phantom-Version": "1.0.0",
        },
      });
      expect(customClient.getBaseUrl()).toBe("https://custom.api.com/swap/v2");
    });

    it("should use environment variables for headers", () => {
      process.env.PHANTOM_SERVICE_AUTH_TOKEN = "test-token";
      process.env.PHANTOM_CLIENT_VERSION = "1.0.0";
      process.env.PHANTOM_CLIENT_PLATFORM = "test-platform";
      process.env.PHANTOM_COUNTRY_CODE = "US";

      const envClient = new SwapperAPIClient();
      expect(envClient).toBeDefined();

      delete process.env.PHANTOM_SERVICE_AUTH_TOKEN;
      delete process.env.PHANTOM_CLIENT_VERSION;
      delete process.env.PHANTOM_CLIENT_PLATFORM;
      delete process.env.PHANTOM_COUNTRY_CODE;
    });
  });

  describe("get", () => {
    it("should make GET request successfully", async () => {
      const mockData = { test: "data" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await client.get("/test");

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/swap/v2/test",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle query parameters", async () => {
      const mockData = { test: "data" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      await client.get("/test", {
        param1: "value1",
        param2: 123,
        param3: true,
        param4: undefined,
      });

      const calledUrl = (mockFetch.mock.calls[0][0] as string);
      expect(calledUrl).toContain("param1=value1");
      expect(calledUrl).toContain("param2=123");
      expect(calledUrl).toContain("param3=true");
      expect(calledUrl).not.toContain("param4");
    });
  });

  describe("post", () => {
    it("should make POST request successfully", async () => {
      const mockData = { result: "success" };
      const requestBody = { test: "body" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await client.post("/test", requestBody);

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/swap/v2/test",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: "BAD_REQUEST",
          message: "Invalid request",
        }),
      } as Response);

      await expect(client.get("/test")).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid request",
        statusCode: 400,
      });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.get("/test")).rejects.toThrow("Network error");
    });

    it("should handle timeout", async () => {
      const slowClient = new SwapperAPIClient({
        timeout: 100,
      });

      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      await expect(slowClient.get("/test")).rejects.toMatchObject({
        code: "TIMEOUT",
        message: "Request timed out",
        statusCode: 408,
      });
    });

    it("should handle JSON parse errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      await expect(client.get("/test")).rejects.toMatchObject({
        code: "UNKNOWN_ERROR",
        message: "Request failed with status 500",
        statusCode: 500,
      });
    });
  });

  describe("updateHeaders", () => {
    it("should update headers", () => {
      expect(() => {
        client.updateHeaders({
          "X-Phantom-Version": "2.0.0",
          Authorization: "Bearer new-token",
        });
      }).not.toThrow();
    });
  });
});