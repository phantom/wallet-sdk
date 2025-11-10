// Mock window.phantom for testing
export interface MockSolanaProvider {
  isPhantom: boolean;
  publicKey: { toString: () => string } | null;
  isConnected: boolean;
  connect: jest.Mock;
  disconnect: jest.Mock;
  signMessage: jest.Mock;
  signAndSendTransaction: jest.Mock;
  signTransaction?: jest.Mock;
  signAllTransactions?: jest.Mock;
  on?: jest.Mock;
  off?: jest.Mock;
}

export interface MockEthereumProvider {
  isPhantom: boolean;
  selectedAddress: string | null;
  request: jest.Mock;
  on?: jest.Mock;
  off?: jest.Mock;
}

export function createMockSolanaProvider(overrides?: Partial<MockSolanaProvider>): MockSolanaProvider {
  return {
    isPhantom: true,
    publicKey: null,
    isConnected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    signMessage: jest.fn(),
    signAndSendTransaction: jest.fn(),
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    ...overrides,
  };
}

export function createMockEthereumProvider(overrides?: Partial<MockEthereumProvider>): MockEthereumProvider {
  return {
    isPhantom: true,
    selectedAddress: null,
    request: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    ...overrides,
  };
}

export function setupWindowMock(providers?: {
  solana?: MockSolanaProvider;
  ethereum?: MockEthereumProvider;
  app?: any;
}) {
  // @ts-ignore
  global.window = global.window || {};
  // @ts-ignore
  global.window.phantom = {
    solana: providers?.solana,
    ethereum: providers?.ethereum,
    app: providers?.app,
  };
}

export function cleanupWindowMock() {
  // @ts-ignore
  delete global.window.phantom;
}
