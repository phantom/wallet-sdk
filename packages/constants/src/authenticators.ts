import { Algorithm } from "@phantom/sdk-types";

// Type as Algorithm so no casting needed, runtime value is Algorithm.ed25519
export const DEFAULT_AUTHENTICATOR_ALGORITHM: Algorithm = Algorithm.ed25519;
