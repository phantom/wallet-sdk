import type { EthereumSignInData } from "./types";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:[0-9]{1,5})?$/;
const IP_REGEX =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,5})?$/;
const LOCALHOST_REGEX = /^localhost(:[0-9]{1,5})?$/;
const NONCE_REGEX = /^[a-zA-Z0-9]{8,}$/;
const SCHEME_REGEX = /^([a-zA-Z][a-zA-Z0-9+-.]*)$/;

/**
 * Creates an EIP-4361 Sign In With Ethereum message.
 *
 * Adapted from viem's createSiweMessage implementation:
 * https://github.com/wevm/viem/blob/53d302049e166706fecde453ea984284dd180ca6/src/utils/siwe/createSiweMessage.ts
 *
 * Copyright (c) 2023-present weth, LLC
 * Licensed under the MIT License.
 */
export function createSiweMessage({
  address,
  chainId,
  domain,
  nonce,
  uri,
  version,
  scheme,
  statement: _statement,
  requestId,
  resources,
  issuedAt = new Date(),
  expirationTime,
  notBefore,
}: EthereumSignInData): string {
  // Required fields
  // Note: this is a simplified variation of viem's getAddress implementation
  if (!ADDRESS_REGEX.test(address)) {
    throw new Error("address must be a hex value of 20 bytes (40 hex characters).");
  }
  if (chainId !== Math.floor(chainId)) {
    throw new Error("chainId must be a EIP-155 chain ID.");
  }
  if (!(DOMAIN_REGEX.test(domain) || IP_REGEX.test(domain) || LOCALHOST_REGEX.test(domain))) {
    throw new Error("domain must be an RFC 3986 authority.");
  }
  if (!NONCE_REGEX.test(nonce)) {
    throw new Error("nonce must be at least 8 characters.");
  }
  if (!_isUri(uri)) {
    throw new Error("uri must be a RFC 3986 URI referring to the resource that is the subject of the signing.");
  }
  if (version !== "1") {
    throw new Error("version must be '1'.");
  }

  // Optional fields
  if (scheme && !SCHEME_REGEX.test(scheme)) {
    throw new Error("scheme must be an RFC 3986 URI scheme.");
  }
  if (_statement?.includes("\n")) {
    throw new Error("statement must not include '\\n'.");
  }

  // Construct message
  const origin = scheme ? `${scheme}://${domain}` : domain;
  const statement = _statement ? `${_statement}\n` : "";

  const prefix = `${origin} wants you to sign in with your Ethereum account:\n${address}\n\n${statement}`;

  let suffix = `URI: ${uri}\nVersion: ${version}\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt.toISOString()}`;

  if (expirationTime) {
    suffix += `\nExpiration Time: ${expirationTime.toISOString()}`;
  }
  if (notBefore) {
    suffix += `\nNot Before: ${notBefore.toISOString()}`;
  }
  if (requestId) {
    suffix += `\nRequest ID: ${requestId}`;
  }
  if (resources) {
    let content = "\nResources:";
    for (const resource of resources) {
      if (!_isUri(resource)) {
        throw new Error("resources must be RFC 3986 URIs.");
      }
      content += `\n- ${resource}`;
    }
    suffix += content;
  }

  return `${prefix}\n${suffix}`;
}

/**
 * Checks if a value is a valid RFC 3986 URI.
 *
 * Taken from viem's isUri implementation:
 * https://github.com/wevm/viem/blob/53d302049e166706fecde453ea984284dd180ca6/src/utils/siwe/utils.ts
 *
 * Copyright (c) 2023-present weth, LLC
 * Licensed under the MIT License.
 */
export function _isUri(value: string) {
  // check for illegal characters
  if (/[^a-z0-9:/?#[\]@!$&'()*+,;=.\-_~%]/i.test(value)) return false;

  // check for hex escapes that aren't complete
  if (/%[^0-9a-f]/i.test(value)) return false;
  if (/%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) return false;

  // from RFC 3986
  const splitted = splitUri(value);
  const scheme = splitted[1];
  const authority = splitted[2];
  const path = splitted[3];
  const query = splitted[4];
  const fragment = splitted[5];

  // scheme and path are required, though the path can be empty
  if (!(scheme?.length && path.length >= 0)) return false;

  // if authority is present, the path must be empty or begin with a /
  if (authority?.length) {
    if (!(path.length === 0 || /^\//.test(path))) return false;
  } else {
    // if authority is not present, the path must not start with //
    if (/^\/\//.test(path)) return false;
  }

  // scheme must begin with a letter, then consist of letters, digits, +, ., or -
  if (!/^[a-z][a-z0-9+\-.]*$/.test(scheme.toLowerCase())) return false;

  let out = "";
  // re-assemble the URL per section 5.3 in RFC 3986
  out += `${scheme}:`;
  if (authority?.length) out += `//${authority}`;

  out += path;

  if (query?.length) out += `?${query}`;
  if (fragment?.length) out += `#${fragment}`;

  return out;
}

function splitUri(value: string) {
  return value.match(/(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/)!;
}
