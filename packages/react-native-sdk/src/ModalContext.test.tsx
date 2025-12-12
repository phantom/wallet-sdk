import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { View } from "react-native";
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

jest.mock("./components/Modal", () => ({
  Modal: ({ children }: { children: ReactNode }) => <View>{children}</View>,
}));

jest.mock("./components/ConnectModalContent", () => ({
  ConnectModalContent: () => <View />,
}));

jest.mock("./components/ConnectedModalContent", () => ({
  ConnectedModalContent: () => <View />,
}));

describe("useModal Hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => <ModalProvider>{children}</ModalProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Hook Usage", () => {
    it("should throw error when used outside of ModalProvider", () => {
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

      const initialOpen = result.current.open;
      const initialClose = result.current.close;

      // Trigger state change
      act(() => {
        result.current.open();
      });
      rerender({});

      expect(result.current.open).toBe(initialOpen);
      expect(result.current.close).toBe(initialClose);

      // Trigger another state change
      act(() => {
        result.current.close();
      });
      rerender({});

      expect(result.current.open).toBe(initialOpen);
      expect(result.current.close).toBe(initialClose);
    });
  });

  describe("Multiple Consumers", () => {
    it("should share state between multiple hook consumers", () => {
      // To test shared state, we need both hooks to use the same provider instance
      const { result } = renderHook(
        () => {
          const modal1 = useModal();
          const modal2 = useModal();
          return { modal1, modal2 };
        },
        { wrapper },
      );

      expect(result.current.modal1.isOpened).toBe(false);
      expect(result.current.modal2.isOpened).toBe(false);

      // Open modal from first consumer
      act(() => {
        result.current.modal1.open();
      });

      // Both should see the same state since they share the same context
      expect(result.current.modal1.isOpened).toBe(true);
      expect(result.current.modal2.isOpened).toBe(true);
    });
  });
});
