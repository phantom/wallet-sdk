import { assertAutoConfirmConfigured } from "./assertions";

describe("assertAutoConfirmConfigured", () => {
  it("should pass when phantom has autoConfirm configured", () => {
    const phantom = {
      autoConfirm: {
        autoConfirmEnable: jest.fn(),
        autoConfirmDisable: jest.fn(),
        autoConfirmStatus: jest.fn(),
        autoConfirmSupportedChains: jest.fn(),
      },
    } as any;

    expect(() => assertAutoConfirmConfigured(phantom)).not.toThrow();
  });

  it("should throw when phantom is undefined", () => {
    expect(() => assertAutoConfirmConfigured(undefined)).toThrow(
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly."
    );
  });

  it("should throw when phantom.autoConfirm is undefined", () => {
    const phantom = {} as any;

    expect(() => assertAutoConfirmConfigured(phantom)).toThrow(
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly."
    );
  });

  it("should throw when phantom.autoConfirm is null", () => {
    const phantom = { autoConfirm: null } as any;

    expect(() => assertAutoConfirmConfigured(phantom)).toThrow(
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly."
    );
  });
});