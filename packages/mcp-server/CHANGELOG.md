# @phantom/mcp-server

## 0.1.8

### Patch Changes

- 9007383: Fix derivation index handling in MCP tools by accepting numeric strings (for example, `"0"`) and coercing them to numbers before validation.

  Improve `buy_token` 405 errors with explicit guidance when `quoteApiUrl` points to a non-Phantom-compatible endpoint.

  Add guardrails in OpenClaw wallet docs/skill to keep `quoteApiUrl` unset by default and only override for explicit debugging.

- Updated dependencies [2d00fb0]
  - @phantom/api-key-stamper@1.0.4
  - @phantom/base64url@1.0.4
  - @phantom/client@1.0.4
  - @phantom/constants@1.0.4
  - @phantom/crypto@1.0.4
  - @phantom/server-sdk@1.0.4
  - @phantom/utils@1.0.4

## 0.1.7

### Patch Changes

- 51a1786: Update headers
- Updated dependencies [5a57f30]
  - @phantom/api-key-stamper@1.0.3
  - @phantom/base64url@1.0.3
  - @phantom/client@1.0.3
  - @phantom/constants@1.0.3
  - @phantom/crypto@1.0.3
  - @phantom/server-sdk@1.0.3
  - @phantom/utils@1.0.3

## 0.1.6

### Patch Changes

- Clarify `buy_token` agent-facing behavior for swap-intent vs buy-intent flows (`exactOut`) and route/landing reliability guidance.
- Add tool annotations and privacy policy for Claude MCP directory submission
  - Add `readOnlyHint`, `destructiveHint`, and `openWorldHint` annotations to all 5 tools
  - Add Privacy Policy section to README

## 0.1.5

### Patch Changes

- 26d1963: Fix numeric amount validation edge cases in MCP server
  - `parseBaseUnitAmount`: reject numbers above `Number.MAX_SAFE_INTEGER` to prevent silent precision loss; callers should pass strings for large base unit amounts
  - `parseUiAmount`: handle exponential notation (e.g., `1e-7`) by using `toFixed(decimals)` instead of `String()`, which previously produced strings like `"1e-7"` that failed regex validation

## 0.1.4

### Patch Changes

- Align swap quote requests with Terminal client-auth behavior by adding Phantom client auth headers (`X-PhantomAuthToken`, `X-PhantomNonce`) and standard Phantom platform/version headers to `buy_token`.

  Keep compatibility headers (`x-api-key`, `X-App-Id`) in quote requests and add test coverage for deterministic client-auth header generation.

## 0.1.3

### Patch Changes

- 2977094: Fix OpenClaw startup failures caused by unwanted DCR registration.
  - `@phantom/openclaw-plugin`: correctly reads plugin-scoped config from full OpenClaw `api.config` payload and fails fast with a clear error when `PHANTOM_APP_ID` is missing.
