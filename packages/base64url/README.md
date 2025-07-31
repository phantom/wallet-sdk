# @phantom/base64url

Isomorphic base64url encoding/decoding utilities that work in both browser and Node.js environments.

## Installation

```bash
npm install @phantom/base64url
```

## Features

- 🌐 **Isomorphic** - Works in both browser and Node.js
- 🚀 **Zero dependencies** - Lightweight and fast
- 📱 **Modern & Legacy** - Supports both modern APIs and older browsers
- 🔒 **URL-safe** - Uses base64url format (RFC 4648)
- 📦 **TypeScript** - Full type support included

## Usage

```typescript
import { base64urlEncode, base64urlDecode, stringToBase64url, base64urlDecodeToString } from "@phantom/base64url";

// Encode string to base64url
const encoded = stringToBase64url("Hello World");
console.log(encoded); // "SGVsbG8gV29ybGQ"

// Decode base64url to string
const decoded = base64urlDecodeToString(encoded);
console.log(decoded); // "Hello World"

// Encode Uint8Array to base64url
const bytes = new Uint8Array([72, 101, 108, 108, 111]);
const encodedBytes = base64urlEncode(bytes);
console.log(encodedBytes); // "SGVsbG8"

// Decode base64url to Uint8Array
const decodedBytes = base64urlDecode(encodedBytes);
console.log(decodedBytes); // Uint8Array([72, 101, 108, 108, 111])
```

## API Reference

### `base64urlEncode(data: string | Uint8Array | ArrayLike<number>): string`

Encodes data to base64url format.

- **data**: String, Uint8Array, or ArrayLike data to encode
- **Returns**: base64url encoded string (no padding, URL-safe)

### `base64urlDecode(str: string): Uint8Array`

Decodes base64url string to Uint8Array.

- **str**: base64url encoded string
- **Returns**: decoded Uint8Array

### `stringToBase64url(str: string): string`

Encodes UTF-8 string to base64url format.

- **str**: UTF-8 string to encode
- **Returns**: base64url encoded string

### `base64urlDecodeToString(str: string): string`

Decodes base64url string to UTF-8 string.

- **str**: base64url encoded string
- **Returns**: decoded UTF-8 string

## Base64url Format

Base64url is a URL-safe variant of Base64 encoding defined in RFC 4648:

- Uses `-` instead of `+`
- Uses `_` instead of `/`
- Removes padding (`=`) characters
- Safe to use in URLs, filenames, and HTTP headers

## Browser Compatibility

- **Modern browsers**: Uses native `btoa`/`atob` and `TextEncoder`/`TextDecoder`
- **Legacy browsers**: Provides fallbacks for older environments
- **Node.js**: Uses `Buffer` for optimal performance

## Examples

### JWT Token Handling

```typescript
import { stringToBase64url, base64urlDecodeToString } from "@phantom/base64url";

const payload = JSON.stringify({
  sub: "1234567890",
  name: "John Doe",
  iat: 1516239022,
});

const encodedPayload = stringToBase64url(payload);
console.log(`JWT payload: ${encodedPayload}`);

const decodedPayload = base64urlDecodeToString(encodedPayload);
console.log(JSON.parse(decodedPayload));
```

### Binary Data Encoding

```typescript
import { base64urlEncode, base64urlDecode } from "@phantom/base64url";

// Encode binary data
const binaryData = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);
const encoded = base64urlEncode(binaryData);
console.log(encoded); // URL-safe encoded string

// Decode back to binary
const decoded = base64urlDecode(encoded);
console.log(decoded); // Original Uint8Array
```

### API Integration

```typescript
import { stringToBase64url } from "@phantom/base64url";

// Safe for URL parameters
const userData = JSON.stringify({ userId: 123, action: "login" });
const safeParam = stringToBase64url(userData);

// Use in URL without encoding issues
const apiUrl = `https://api.example.com/auth?data=${safeParam}`;
```

## License

MIT
