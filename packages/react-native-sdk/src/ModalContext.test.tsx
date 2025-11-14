import React from "react";
import { renderHook } from "@testing-library/react-native";
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

jest.mock("./components/Modal", () => ({
  Modal: ({ children }: { children: ReactNode }) => <mock-modal>{children}</mock-modal>,
}));

jest.mock("./components/ConnectModalContent", () => ({
  ConnectModalContent: () => <mock-connect-content />,
}));

jest.mock("./components/ConnectedModalContent", () => ({
  ConnectedModalContent: () => <mock-connected-content />,
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
      const { result } = renderHook(() => useModal());
      
      expect(result.error).toEqual(
        new Error("useModal must be used within a ModalProvider")
      );
    });

    it("should return modal context when used within ModalProvider", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      expect(result.current).toEqual({
        isModalOpen: false,
        openModal: expect.any(Function),
        closeModal: expect.any(Function),
      });
    });
  });

  describe("Modal State Management", () => {
    it("should initially have modal closed", () => {
      const { result } = renderHook(() => useModal(), { wrapper });
      
      expect(result.current.isModalOpen).toBe(false);
    });

    it("should open modal when openModal is called", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });
      
      expect(result.current.isModalOpen).toBe(false);
      
      result.current.openModal();
      rerender({});
      
      expect(result.current.isModalOpen).toBe(true);
    });

    it("should close modal when closeModal is called", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });
      
      // Open modal first
      result.current.openModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(true);
      
      // Then close it
      result.current.closeModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(false);
    });

    it("should handle multiple open/close cycles", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });
      
      // First cycle
      result.current.openModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(true);
      
      result.current.closeModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(false);
      
      // Second cycle
      result.current.openModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(true);
      
      result.current.closeModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(false);
    });

    it("should be idempotent when calling openModal multiple times", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });
      
      result.current.openModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(true);
      
      result.current.openModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(true);
    });

    it("should be idempotent when calling closeModal multiple times", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });
      
      result.current.openModal();
      rerender({});
      
      result.current.closeModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(false);
      
      result.current.closeModal();
      rerender({});
      expect(result.current.isModalOpen).toBe(false);
    });
  });

  describe("Function Stability", () => {
    it("should maintain stable references for openModal and closeModal", () => {
      const { result, rerender } = renderHook(() => useModal(), { wrapper });
      
      const initialOpenModal = result.current.openModal;
      const initialCloseModal = result.current.closeModal;
      
      // Trigger state change
      result.current.openModal();
      rerender({});
      
      expect(result.current.openModal).toBe(initialOpenModal);
      expect(result.current.closeModal).toBe(initialCloseModal);
      
      // Trigger another state change
      result.current.closeModal();
      rerender({});
      
      expect(result.current.openModal).toBe(initialOpenModal);
      expect(result.current.closeModal).toBe(initialCloseModal);
    });
  });

  describe("Multiple Consumers", () => {
    it("should share state between multiple hook consumers", () => {
      const { result: result1 } = renderHook(() => useModal(), { wrapper });
      const { result: result2 } = renderHook(() => useModal(), { wrapper });
      
      expect(result1.current.isModalOpen).toBe(false);
      expect(result2.current.isModalOpen).toBe(false);
      
      // Open modal from first consumer
      result1.current.openModal();
      
      // Both consumers should see the updated state
      const { result: result3 } = renderHook(() => useModal(), { wrapper });
      expect(result3.current.isModalOpen).toBe(true);
    });
  });
});
