import { createSiweMessage, _isUri } from "./siwe";
import type { EthereumSignInData } from "./types";

describe("siwe", () => {
  /**
   * Adapted from viem's createSiweMessage tests:
   * https://github.com/wevm/viem/blob/53d302049e166706fecde453ea984284dd180ca6/src/utils/siwe/createSiweMessage.test.ts
   *
   * Copyright (c) 2023-present weth, LLC
   * Licensed under the MIT License.
   */
  describe("createSiweMessage", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const message = {
      address: "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e",
      chainId: 1,
      domain: "example.com",
      nonce: "foobarbaz",
      uri: "https://example.com/path",
      version: "1",
    } satisfies EthereumSignInData;

    test("default", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(createSiweMessage(message)).toMatchInlineSnapshot(`
    "example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z"
  `);
    });

    test("parameters: domain", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(
        createSiweMessage({
          ...message,
          domain: "foo.example.com",
        }),
      ).toMatchInlineSnapshot(`
    "foo.example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z"
  `);

      expect(
        createSiweMessage({
          ...message,
          domain: "example.co.uk",
        }),
      ).toMatchInlineSnapshot(`
    "example.co.uk wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z"
  `);
    });

    test("parameters: scheme", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(
        createSiweMessage({
          ...message,
          scheme: "https",
        }),
      ).toMatchInlineSnapshot(`
    "https://example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z"
  `);
    });

    test("parameters: statement", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(
        createSiweMessage({
          ...message,
          statement: "I accept the ExampleOrg Terms of Service: https://example.com/tos",
        }),
      ).toMatchInlineSnapshot(`
    "example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e

    I accept the ExampleOrg Terms of Service: https://example.com/tos

    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z"
  `);
    });

    test("parameters: issuedAt", () => {
      const issuedAt = new Date(Date.UTC(2022, 1, 4));
      expect(createSiweMessage({ ...message, issuedAt })).toMatchInlineSnapshot(`
    "example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2022-02-04T00:00:00.000Z"
  `);
    });

    test("parameters: expirationTime", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(
        createSiweMessage({
          ...message,
          expirationTime: new Date(Date.UTC(2022, 1, 4)),
        }),
      ).toMatchInlineSnapshot(`
    "example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z
    Expiration Time: 2022-02-04T00:00:00.000Z"
  `);
    });

    test("parameters: notBefore", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(
        createSiweMessage({
          ...message,
          notBefore: new Date(Date.UTC(2022, 1, 4)),
        }),
      ).toMatchInlineSnapshot(`
    "example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z
    Not Before: 2022-02-04T00:00:00.000Z"
  `);
    });

    test("parameters: requestId", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(
        createSiweMessage({
          ...message,
          requestId: "123e4567-e89b-12d3-a456-426614174000",
        }),
      ).toMatchInlineSnapshot(`
    "example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z
    Request ID: 123e4567-e89b-12d3-a456-426614174000"
  `);
    });

    test("parameters: resources", () => {
      jest.setSystemTime(new Date(Date.UTC(2023, 1, 1)));

      expect(
        createSiweMessage({
          ...message,
          resources: ["https://example.com/foo", "https://example.com/bar", "https://example.com/baz"],
        }),
      ).toMatchInlineSnapshot(`
    "example.com wants you to sign in with your Ethereum account:
    0xA0Cf798816D4b9b9866b5330EEa46a18382f251e


    URI: https://example.com/path
    Version: 1
    Chain ID: 1
    Nonce: foobarbaz
    Issued At: 2023-02-01T00:00:00.000Z
    Resources:
    - https://example.com/foo
    - https://example.com/bar
    - https://example.com/baz"
  `);
    });

    test("behavior: invalid address", () => {
      expect(() => createSiweMessage({ ...message, address: "0xfoobarbaz" })).toThrowErrorMatchingInlineSnapshot(
        `"address must be a hex value of 20 bytes (40 hex characters)."`,
      );
    });

    test("behavior: invalid chainId", () => {
      expect(() => createSiweMessage({ ...message, chainId: 1.1 })).toThrowErrorMatchingInlineSnapshot(
        `"chainId must be a EIP-155 chain ID."`,
      );
    });

    test("behavior: invalid domain", () => {
      expect(() => createSiweMessage({ ...message, domain: "#foo" })).toThrowErrorMatchingInlineSnapshot(
        `"domain must be an RFC 3986 authority."`,
      );
    });

    test("behavior: invalid nonce", () => {
      expect(() => createSiweMessage({ ...message, nonce: "#foo" })).toThrowErrorMatchingInlineSnapshot(
        `"nonce must be at least 8 characters."`,
      );
    });

    test("behavior: invalid uri", () => {
      expect(() => createSiweMessage({ ...message, uri: "#foo" })).toThrowErrorMatchingInlineSnapshot(
        `"uri must be a RFC 3986 URI referring to the resource that is the subject of the signing."`,
      );
    });

    test("behavior: invalid version", () => {
      expect(() =>
        // @ts-expect-error
        createSiweMessage({ ...message, version: "2" }),
      ).toThrowErrorMatchingInlineSnapshot(`"version must be '1'."`);
    });

    test("behavior: invalid scheme", () => {
      expect(() => createSiweMessage({ ...message, scheme: "foo_bar" })).toThrowErrorMatchingInlineSnapshot(
        `"scheme must be an RFC 3986 URI scheme."`,
      );
    });

    test("behavior: invalid statement", () => {
      expect(() => createSiweMessage({ ...message, statement: "foo\nbar" })).toThrowErrorMatchingInlineSnapshot(
        `"statement must not include '\\n'."`,
      );
    });

    test("behavior: invalid resources", () => {
      expect(() =>
        createSiweMessage({
          ...message,
          resources: ["https://example.com", "foo"],
        }),
      ).toThrowErrorMatchingInlineSnapshot(`"resources must be RFC 3986 URIs."`);
    });

    test.each(["example.com", "localhost", "127.0.0.1", "example.com:3000", "localhost:3000", "127.0.0.1:3000"])(
      "valid domain `%s`",
      domain => {
        expect(
          typeof createSiweMessage({
            ...message,
            domain,
          }),
        ).toBe("string");
      },
    );

    test.each([
      "http://example.com",
      "http://localhost",
      "http://127.0.0.1",
      "http://example.com:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "foobarbaz",
      "-example.com",
    ])("invalid domain `%s`", domain => {
      expect(() =>
        createSiweMessage({
          ...message,
          domain,
        }),
      ).toThrowError();
    });
  });

  /**
   * Adapted from viem's utils tests:
   * https://github.com/wevm/viem/blob/53d302049e166706fecde453ea984284dd180ca6/src/utils/siwe/utils.ts
   *
   * Copyright (c) 2023-present weth, LLC
   * Licensed under the MIT License.
   */
  describe("_isUri", () => {
    test("_isUri - default", () => {
      expect(_isUri("https://example.com/foo")).toMatchInlineSnapshot(`"https://example.com/foo"`);
    });

    test("_isUri - behavior: check for illegal characters", () => {
      expect(_isUri("^")).toBeFalsy();
    });

    test("_isUri - incomplete hex escapes", () => {
      expect(_isUri("%$#")).toBeFalsy();
      expect(_isUri("%0:#")).toBeFalsy();
    });

    test("_isUri - missing scheme", () => {
      expect(_isUri("example.com/foo")).toBeFalsy();
    });

    test("_isUri - authority with missing path", () => {
      expect(_isUri("1http:////foo.html")).toBeFalsy();
    });

    test("_isUri - scheme begins with letter", () => {
      expect(_isUri("$https://example.com/foo")).toBeFalsy();
    });

    test("_isUri - query", () => {
      expect(_isUri("https://example.com/foo?bar")).toMatchInlineSnapshot(`"https://example.com/foo?bar"`);
    });

    test("_isUri - fragment", () => {
      expect(_isUri("https://example.com/foo#bar")).toMatchInlineSnapshot(`"https://example.com/foo#bar"`);
    });
  });
});
