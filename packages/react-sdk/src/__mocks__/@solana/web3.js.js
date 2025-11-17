export const Connection = jest.fn();
export const PublicKey = jest.fn(() => ({
  toString: () => "mocked-public-key",
  toBase58: () => "mocked-public-key",
}));
export const Transaction = jest.fn();
export const SystemProgram = {
  transfer: jest.fn(),
};
export const LAMPORTS_PER_SOL = 1000000000;
