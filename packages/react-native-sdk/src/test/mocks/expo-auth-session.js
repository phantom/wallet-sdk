module.exports = {
  makeRedirectUri: jest.fn(config => `${config?.scheme || "exp"}://auth-callback`),
};
