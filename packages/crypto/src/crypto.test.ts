import { generateKeyPair, createKeyPairFromSecret, signWithSecret } from "./index";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { Buffer } from "buffer";

describe("Crypto Utils", () => {
  describe("generateKeyPair", () => {
    it("should generate a valid keypair", () => {
      const keypair = generateKeyPair();

      expect(keypair).toHaveProperty("publicKey");
      expect(keypair).toHaveProperty("secretKey");
      expect(typeof keypair.publicKey).toBe("string");
      expect(typeof keypair.secretKey).toBe("string");

      // Should be valid base58 strings
      expect(() => bs58.decode(keypair.publicKey)).not.toThrow();
      expect(() => bs58.decode(keypair.secretKey)).not.toThrow();

      // Public key should be 32 bytes, secret key should be 64 bytes
      expect(bs58.decode(keypair.publicKey)).toHaveLength(32);
      expect(bs58.decode(keypair.secretKey)).toHaveLength(64);
    });

    it("should generate different keypairs on each call", () => {
      const keypair1 = generateKeyPair();
      const keypair2 = generateKeyPair();

      expect(keypair1.publicKey).not.toBe(keypair2.publicKey);
      expect(keypair1.secretKey).not.toBe(keypair2.secretKey);
    });
  });

  describe("createKeyPairFromSecret", () => {
    it("should create a keypair from a valid secret key", () => {
      // Generate a keypair first to get a valid secret key
      const originalKeypair = generateKeyPair();

      // Create a new keypair from the secret key
      const recreatedKeypair = createKeyPairFromSecret(originalKeypair.secretKey);

      // Should have the same keys
      expect(recreatedKeypair.publicKey).toBe(originalKeypair.publicKey);
      expect(recreatedKeypair.secretKey).toBe(originalKeypair.secretKey);
    });

    it("should throw an error for invalid secret key", () => {
      expect(() => createKeyPairFromSecret("invalid-key")).toThrow();
    });

    it("should create a valid keypair that can be used for signing", () => {
      const originalKeypair = generateKeyPair();
      const recreatedKeypair = createKeyPairFromSecret(originalKeypair.secretKey);

      const message = "test message";
      const messageBytes = new TextEncoder().encode(message);

      // Sign with the recreated keypair
      const signature = signWithSecret(recreatedKeypair.secretKey, messageBytes);

      // Verify the signature with the public key
      const publicKeyBytes = bs58.decode(recreatedKeypair.publicKey);
      const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);

      expect(isValid).toBe(true);
    });
  });

  describe("signWithSecret", () => {
    let keypair: ReturnType<typeof generateKeyPair>;

    beforeEach(() => {
      keypair = generateKeyPair();
    });

    it("should sign a string message", () => {
      const message = "Hello, World!";
      const signature = signWithSecret(keypair.secretKey, message);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature).toHaveLength(64); // Ed25519 signature length

      // Verify the signature
      const messageBytes = new TextEncoder().encode(message);
      const publicKeyBytes = bs58.decode(keypair.publicKey);
      const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);

      expect(isValid).toBe(true);
    });

    it("should sign a Uint8Array message", () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = signWithSecret(keypair.secretKey, message);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature).toHaveLength(64);

      // Verify the signature
      const publicKeyBytes = bs58.decode(keypair.publicKey);
      const isValid = nacl.sign.detached.verify(message, signature, publicKeyBytes);

      expect(isValid).toBe(true);
    });

    it("should sign a Buffer message", () => {
      const message = Buffer.from("test message", "utf8");
      const signature = signWithSecret(keypair.secretKey, message);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature).toHaveLength(64);

      // Verify the signature
      const publicKeyBytes = bs58.decode(keypair.publicKey);
      const isValid = nacl.sign.detached.verify(new Uint8Array(message), signature, publicKeyBytes);

      expect(isValid).toBe(true);
    });

    it("should work with Uint8Array secret key", () => {
      const secretKeyBytes = bs58.decode(keypair.secretKey);
      const message = "test with raw secret key";

      const signature = signWithSecret(secretKeyBytes, message);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature).toHaveLength(64);

      // Verify the signature
      const messageBytes = new TextEncoder().encode(message);
      const publicKeyBytes = bs58.decode(keypair.publicKey);
      const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);

      expect(isValid).toBe(true);
    });

    it("should produce different signatures for different messages", () => {
      const message1 = "first message";
      const message2 = "second message";

      const signature1 = signWithSecret(keypair.secretKey, message1);
      const signature2 = signWithSecret(keypair.secretKey, message2);

      expect(signature1).not.toEqual(signature2);
    });

    it("should produce the same signature for the same message", () => {
      const message = "consistent message";

      const signature1 = signWithSecret(keypair.secretKey, message);
      const signature2 = signWithSecret(keypair.secretKey, message);

      expect(signature1).toEqual(signature2);
    });

    it("should throw an error for invalid secret key", () => {
      const message = "test message";

      expect(() => signWithSecret("invalid-key", message)).toThrow();
    });
  });

  describe("Integration tests", () => {
    it("should work end-to-end: generate -> sign -> verify", () => {
      // Generate a keypair
      const keypair = generateKeyPair();

      // Sign a message
      const message = "End-to-end test message";
      const signature = signWithSecret(keypair.secretKey, message);

      // Verify the signature
      const messageBytes = new TextEncoder().encode(message);
      const publicKeyBytes = bs58.decode(keypair.publicKey);
      const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);

      expect(isValid).toBe(true);
    });

    it("should work with createKeyPairFromSecret workflow", () => {
      // Generate original keypair
      const originalKeypair = generateKeyPair();

      // Recreate keypair from secret
      const recreatedKeypair = createKeyPairFromSecret(originalKeypair.secretKey);

      // Sign with recreated keypair
      const message = "Test with recreated keypair";
      const signature = signWithSecret(recreatedKeypair.secretKey, message);

      // Verify with original public key
      const messageBytes = new TextEncoder().encode(message);
      const publicKeyBytes = bs58.decode(originalKeypair.publicKey);
      const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);

      expect(isValid).toBe(true);
    });
  });
});
