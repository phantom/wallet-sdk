---
"@phantom/browser-sdk": patch
"@phantom/react-sdk": patch
"@phantom/react-native-sdk": patch
"@phantom/react-ui": patch
"@phantom/embedded-provider-core": patch
"@phantom/browser-injected-sdk": patch
"@phantom/client": patch
"@phantom/server-sdk": patch
---

Update configuration to use appId instead of organizationId

- Refactored BrowserSDKConfig interface to use appId parameter
- Updated all SDK packages and examples to use appId consistently
- Maintained backward compatibility for stamper interfaces which still use organizationId internally
- Fixed TypeScript build errors in demo applications
- Added proper environment variable type definitions