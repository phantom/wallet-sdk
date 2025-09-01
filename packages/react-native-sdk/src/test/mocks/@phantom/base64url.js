module.exports = {
  base64urlEncode: jest.fn(data => "mock-base64url-encoded-data"),
  base64urlDecode: jest.fn(str => new Uint8Array([100, 101, 99, 111, 100, 101, 100])),
  stringToBase64url: jest.fn(str => `encoded-${str}`),
  base64urlDecodeToString: jest.fn(str => `decoded-${str}`),
};
