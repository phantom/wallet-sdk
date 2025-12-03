import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { View } from "react-native";
import { ModalProvider } from "./ModalProvider";
import { useModal } from "./ModalContext";
import { usePhantom } from "./PhantomContext";
import type { ReactNode } from "react";

// Mock dependencies
jest.mock("./PhantomContext", () => ({
  usePhantom: jest.fn(),
}));

jest.mock("./components/Modal", () => ({
  Modal: ({
    children,
    isVisible,
    onClose,
    isConnected,
    appIcon,
    appName,
  }: {
    children: ReactNode;
    isVisible: boolean;
    onClose: () => void;
    isConnected?: boolean;
    appIcon?: string;
    appName?: string;
  }) => (
    <View
      testID="modal"
      // @ts-ignore - adding props for testing
      isVisible={isVisible}
      onClose={onClose}
      isConnected={isConnected}
      appIcon={appIcon}
      appName={appName}
    >
      {children}
    </View>
  ),
}));

jest.mock("./components/ConnectModalContent", () => ({
  ConnectModalContent: ({ onClose, appIcon, appName }: { onClose: () => void; appIcon?: string; appName?: string }) => (
    <View
      testID="connect-content"
      // @ts-ignore - adding props for testing
      onClose={onClose}
      appIcon={appIcon}
      appName={appName}
    />
  ),
}));

jest.mock("./components/ConnectedModalContent", () => ({
  ConnectedModalContent: ({ onClose }: { onClose: () => void }) => (
    <View testID="connected-content" /* @ts-ignore */ onClose={onClose} />
  ),
}));

describe("ModalProvider", () => {
  const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePhantom.mockReturnValue({
      isConnected: false,
      addresses: [],
      walletId: null,
      sdk: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getAddresses: jest.fn().mockReturnValue([]),
      isConnecting: false,
      isDisconnecting: false,
      config: {} as any,
      currentProviderType: null,
      allowedProviders: ["google", "apple"],
      errors: {},
      clearError: jest.fn(),
    });
  });

  describe("Rendering", () => {
    it("should render children", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <View testID="test-child" />
        </ModalProvider>,
      );

      expect(getByTestId("test-child")).toBeTruthy();
    });

    it("should render Modal component", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <mock-child />
        </ModalProvider>,
      );

      expect(getByTestId("modal")).toBeTruthy();
    });

    it("should render ConnectModalContent when not connected", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <mock-child />
        </ModalProvider>,
      );

      expect(getByTestId("connect-content")).toBeTruthy();
    });

    it("should render ConnectedModalContent when connected", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnected: true,
      } as any);

      const { getByTestId } = render(
        <ModalProvider>
          <mock-child />
        </ModalProvider>,
      );

      expect(getByTestId("connected-content")).toBeTruthy();
    });

    it("should pass appIcon and appName to Modal", () => {
      const { getByTestId } = render(
        <ModalProvider appIcon="https://example.com/icon.png" appName="Test App">
          <View />
        </ModalProvider>,
      );

      const modal = getByTestId("modal");
      expect(modal.props.appIcon).toBe("https://example.com/icon.png");
      expect(modal.props.appName).toBe("Test App");
    });
  });

  describe("Modal State Management", () => {
    const TestComponent = () => {
      const { isOpened, open, close } = useModal();
      return <mock-test-component testID="test-component" isModalOpen={isOpened} onOpen={open} onClose={close} />;
    };

    it("should provide modal context to children", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      const testComponent = getByTestId("test-component");
      expect(testComponent.props.isModalOpen).toBe(false);
      expect(typeof testComponent.props.onOpen).toBe("function");
      expect(typeof testComponent.props.onClose).toBe("function");
    });

    it("should update modal visibility when opening", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      const testComponent = getByTestId("test-component");
      const modal = getByTestId("modal");

      expect(modal.props.isVisible).toBe(false);

      fireEvent(testComponent, "onOpen");

      expect(getByTestId("modal").props.isVisible).toBe(true);
    });

    it("should update modal visibility when closing", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      const testComponent = getByTestId("test-component");

      // Open modal first
      fireEvent(testComponent, "onOpen");
      expect(getByTestId("modal").props.isVisible).toBe(true);

      // Then close it
      fireEvent(testComponent, "onClose");
      expect(getByTestId("modal").props.isVisible).toBe(false);
    });

    it("should close modal when Modal's onClose is called", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      const testComponent = getByTestId("test-component");

      // Open modal
      fireEvent(testComponent, "onOpen");
      expect(getByTestId("modal").props.isVisible).toBe(true);

      // Close via Modal's onClose
      const modal = getByTestId("modal");
      fireEvent(modal, "onClose");

      expect(getByTestId("modal").props.isVisible).toBe(false);
    });
  });

  describe("Content Switching", () => {
    it("should switch from ConnectModalContent to ConnectedModalContent when connection status changes", () => {
      const { getByTestId, rerender, queryByTestId } = render(
        <ModalProvider>
          <mock-child />
        </ModalProvider>,
      );

      // Initially not connected
      expect(getByTestId("connect-content")).toBeTruthy();
      expect(queryByTestId("connected-content")).toBeNull();

      // Update connection status
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnected: true,
      } as any);

      rerender(
        <ModalProvider>
          <mock-child />
        </ModalProvider>,
      );

      // Now connected
      expect(queryByTestId("connect-content")).toBeNull();
      expect(getByTestId("connected-content")).toBeTruthy();
    });
  });

  describe("Props Passing", () => {
    it("should pass appIcon and appName to ConnectModalContent", () => {
      const { getByTestId } = render(
        <ModalProvider appIcon="https://example.com/icon.png" appName="Test App">
          <mock-child />
        </ModalProvider>,
      );

      const connectContent = getByTestId("connect-content");
      expect(connectContent.props.appIcon).toBe("https://example.com/icon.png");
      expect(connectContent.props.appName).toBe("Test App");
    });

    it("should pass onClose to modal content components", () => {
      const OpenOnMount = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      const { getByTestId } = render(
        <ModalProvider>
          <OpenOnMount />
        </ModalProvider>,
      );

      const connectContent = getByTestId("connect-content");
      expect(typeof connectContent.props.onClose).toBe("function");

      // Verify onClose works
      fireEvent(connectContent, "onClose");
      expect(getByTestId("modal").props.isVisible).toBe(false);
    });
  });
});
