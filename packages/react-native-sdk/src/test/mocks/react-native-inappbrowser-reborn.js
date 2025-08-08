// Mock for react-native-inappbrowser-reborn
module.exports = {
  InAppBrowser: {
    isAvailable: jest.fn(() => Promise.resolve(true)),
    openAuth: jest.fn((authUrl, redirectUrl) => {
      // Mock successful authentication
      const mockRedirectUrl = `${redirectUrl}?walletId=mock-wallet-id&provider=mock-provider&userId=mock-user-id`;
      return Promise.resolve({
        type: 'success',
        url: mockRedirectUrl,
      });
    }),
  },
};