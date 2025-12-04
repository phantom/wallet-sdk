import { renderHook, act } from "@testing-library/react";
import { ModalProvider } from "./ModalProvider";
import { useModal } from "./ModalContext";
import type { ReactNode } from "react";

// Mock dependencies
const mockClearError = jest.fn();

jest.mock("./PhantomContext", () => ({
  usePhantom: jest.fn(() => ({
    isConnected: false,
    addresses: [],
    errors: {},
    clearError: mockClearError,
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
  const wrapper = ({ children }: { children: ReactNode }) => <ModalProvider>{children}</ModalProvider>;

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

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpened).toBe(true);
    });

    it("should close modal when close is called", () => {
      const { result } = renderHook(() => useModal(), { wrapper });

      // Open modal first
      act(() => {
        result.current.open();
      });
      expect(result.current.isOpened).toBe(true);

      // Then close it
      act(() => {
        result.current.close();
      });
      expect(result.current.isOpened).toBe(false);
    });

    it("should handle multiple open/close cycles", () => {
      const { result } = renderHook(() => useModal(), { wrapper });

      // First cycle
      act(() => {
        result.current.open();
      });
      expect(result.current.isOpened).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpened).toBe(false);

      // Second cycle
      act(() => {
        result.current.open();
      });
      expect(result.current.isOpened).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpened).toBe(false);
    });

    it("should be idempotent when calling open multiple times", () => {
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpened).toBe(true);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpened).toBe(true);
    });

    it("should be idempotent when calling close multiple times", () => {
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.open();
      });

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpened).toBe(false);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpened).toBe(false);
    });
  });

  describe("Function Stability", () => {
    it("should maintain stable references for open and close", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });

      const initialOpenModal = result.current.open;
      const initialCloseModal = result.current.close;

      // Trigger state change
      act(() => {
        result.current.open();
      });
      rerender();

      expect(result.current.open).toBe(initialOpenModal);
      expect(result.current.close).toBe(initialCloseModal);

      // Trigger another state change
      act(() => {
        result.current.close();
      });
      rerender();

      expect(result.current.open).toBe(initialOpenModal);
      expect(result.current.close).toBe(initialCloseModal);
    });
  });

  describe("Multiple Consumers", () => {
    it("should share state between multiple hook consumers", () => {
      const { result } = renderHook(
        () => {
          const first = useModal();
          const second = useModal();
          return { first, second };
        },
        { wrapper },
      );

      expect(result.current.first.isOpened).toBe(false);
      expect(result.current.second.isOpened).toBe(false);

      // Open modal from first consumer
      act(() => {
        result.current.first.open();
      });

      // Both consumers should see the updated state
      expect(result.current.first.isOpened).toBe(true);
      expect(result.current.second.isOpened).toBe(true);
    });
  });

  // We intentionally don't assert on fine-grained render counts here; those
  // optimizations are an implementation detail of React/context.
});
