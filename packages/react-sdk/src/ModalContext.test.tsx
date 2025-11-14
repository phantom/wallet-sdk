import React from "react";
import { renderHook, render } from "@testing-library/react";
import { ModalProvider } from "./ModalProvider";
import { useModal } from "./ModalContext";
import type { ReactNode } from "react";

// Mock dependencies
jest.mock("./PhantomContext", () => ({
  usePhantom: jest.fn(() => ({
    isConnected: false,
    addresses: [],
  })),
}));

jest.mock("@phantom/browser-sdk", () => ({
  isMobileDevice: jest.fn(() => false),
}));

jest.mock("@phantom/wallet-sdk-ui", () => ({
  Modal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("./components/ConnectModalContent", () => ({
  ConnectModalContent: () => <div>Connect Content</div>,
}));

jest.mock("./components/ConnectedModalContent", () => ({
  ConnectedModalContent: () => <div>Connected Content</div>,
}));

describe("useModal Hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Hook Usage", () => {
    it("should throw error when used outside of ModalProvider", () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useModal());
      }).toThrow("useModal must be used within a ModalProvider");

      console.error = originalError;
    });

    it("should return modal context when used within ModalProvider", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      expect(result.current).toEqual({
        isOpened: false,
        open: expect.any(Function),
        close: expect.any(Function),
      });
    });
  });

  describe("Modal State Management", () => {
    it("should initially have modal closed", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      expect(result.current.isOpened).toBe(false);
    });

    it("should open modal when open is called", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      expect(result.current.isOpened).toBe(false);
      
      result.current.open();
      
      expect(result.current.isOpened).toBe(true);
    });

    it("should close modal when close is called", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      // Open modal first
      result.current.open();
      expect(result.current.isOpened).toBe(true);
      
      // Then close it
      result.current.close();
      expect(result.current.isOpened).toBe(false);
    });

    it("should handle multiple open/close cycles", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      // First cycle
      result.current.open();
      expect(result.current.isOpened).toBe(true);
      
      result.current.close();
      expect(result.current.isOpened).toBe(false);
      
      // Second cycle
      result.current.open();
      expect(result.current.isOpened).toBe(true);
      
      result.current.close();
      expect(result.current.isOpened).toBe(false);
    });

    it("should be idempotent when calling open multiple times", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      result.current.open();
      expect(result.current.isOpened).toBe(true);
      
      result.current.open();
      expect(result.current.isOpened).toBe(true);
    });

    it("should be idempotent when calling close multiple times", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      result.current.open();
      
      result.current.close();
      expect(result.current.isOpened).toBe(false);
      
      result.current.close();
      expect(result.current.isOpened).toBe(false);
    });
  });

  describe("Function Stability", () => {
    it("should maintain stable references for open and close", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });
      
      const initialOpenModal = result.current.open;
      const initialCloseModal = result.current.close;
      
      // Trigger state change
      result.current.open();
      rerender();
      
      expect(result.current.open).toBe(initialOpenModal);
      expect(result.current.close).toBe(initialCloseModal);
      
      // Trigger another state change
      result.current.close();
      rerender();
      
      expect(result.current.open).toBe(initialOpenModal);
      expect(result.current.close).toBe(initialCloseModal);
    });
  });

  describe("Multiple Consumers", () => {
    it("should share state between multiple hook consumers", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ModalProvider>{children}</ModalProvider>
      );

      const { result: result1 } = renderHook(() => useModal(), { wrapper });
      const { result: result2 } = renderHook(() => useModal(), { wrapper });
      
      expect(result1.current.isOpened).toBe(false);
      expect(result2.current.isOpened).toBe(false);
      
      // Open modal from first consumer
      result1.current.open();
      
      // Should update immediately in the same context
      expect(result1.current.isOpened).toBe(true);
      expect(result2.current.isOpened).toBe(true);
    });
  });

  describe("Context Value Optimization", () => {
    it("should memoize context value to prevent unnecessary rerenders", () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const modal = useModal();
        return <div>{modal.isOpened ? "Open" : "Closed"}</div>;
      };

      const { rerender } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(renderCount).toBe(1);

      // Force a rerender of the provider
      rerender(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      // Should not cause additional render if state hasn't changed
      expect(renderCount).toBe(1);
    });
  });
});
