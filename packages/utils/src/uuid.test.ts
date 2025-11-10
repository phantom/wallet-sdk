import { randomUUID, randomString } from "./uuid";

describe("UUID Utils", () => {
  describe("randomUUID", () => {
    it("should generate a valid UUID v4 format", () => {
      const uuid = randomUUID();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(uuid).toMatch(uuidRegex);
    });

    it("should generate unique UUIDs", () => {
      const uuid1 = randomUUID();
      const uuid2 = randomUUID();

      expect(uuid1).not.toEqual(uuid2);
    });

    it("should always have version 4 identifier", () => {
      const uuid = randomUUID();

      // The 13th character should be '4' (version 4)
      expect(uuid.charAt(14)).toBe("4");
    });

    it("should have proper variant bits", () => {
      const uuid = randomUUID();

      // The 17th character should be 8, 9, A, or B (variant bits 10xx)
      const variantChar = uuid.charAt(19).toLowerCase();
      expect(["8", "9", "a", "b"]).toContain(variantChar);
    });
  });

  describe("randomString", () => {
    it("should generate string of specified length", () => {
      const str5 = randomString(5);
      const str10 = randomString(10);
      const str20 = randomString(20);

      expect(str5).toHaveLength(5);
      expect(str10).toHaveLength(10);
      expect(str20).toHaveLength(20);
    });

    it("should generate unique strings", () => {
      const str1 = randomString(10);
      const str2 = randomString(10);

      expect(str1).not.toEqual(str2);
    });

    it("should only contain alphanumeric characters", () => {
      const str = randomString(100);
      const alphanumericRegex = /^[A-Za-z0-9]+$/;

      expect(str).toMatch(alphanumericRegex);
    });

    it("should handle edge cases", () => {
      const emptyStr = randomString(0);
      const singleChar = randomString(1);

      expect(emptyStr).toHaveLength(0);
      expect(singleChar).toHaveLength(1);
    });
  });
});
