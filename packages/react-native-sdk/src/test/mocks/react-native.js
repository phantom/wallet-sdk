module.exports = {
  Linking: {
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
};
