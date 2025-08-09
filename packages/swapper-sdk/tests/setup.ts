import "dotenv/config";

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});