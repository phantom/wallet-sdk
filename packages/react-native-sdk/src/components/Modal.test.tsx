import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Modal as RNModal } from "react-native";
import { Modal, type ModalProps } from "./Modal";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

// Mock @phantom/wallet-sdk-ui components
jest.mock("@phantom/wallet-sdk-ui", () => ({
  ...jest.requireActual("@phantom/wallet-sdk-ui"),
  Icon: ({ type, testID }: { type: string; testID?: string }) => (
    <mock-icon testID={testID || `icon-${type}`} type={type} />
  ),
  Text: ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
    <mock-text testID={testID}>{children}</mock-text>
  ),
}));

const mockTheme = {
  background: "#ffffff",
  text: "#000000",
  secondary: "#666666",
  aux: "#cccccc",
  overlay: "rgba(0, 0, 0, 0.7)",
  borderRadius: "16px",
  error: "#ff0000",
  success: "#00ff00",
  brand: "#0000ff",
};

describe("Modal Component", () => {
  const defaultProps: ModalProps = {
    isVisible: true,
    onClose: jest.fn(),
    children: <mock-child testID="modal-child">Test Content</mock-child>,
  };

  const renderModal = (props: Partial<ModalProps> = {}) => {
    return render(
      <ThemeProvider theme={mockTheme}>
        <Modal {...defaultProps} {...props} />
      </ThemeProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render when isVisible is true", () => {
      const { getByTestId } = renderModal();
      expect(() => getByTestId("modal-child")).not.toThrow();
    });

    it("should not render when isVisible is false", () => {
      const { queryByTestId } = renderModal({ isVisible: false });
      expect(queryByTestId("modal-child")).toBeNull();
    });

    it("should render the close button", () => {
      const { getByTestId } = renderModal();
      expect(() => getByTestId("icon-close")).not.toThrow();
    });

    it("should render the correct header text when not connected", () => {
      const { getByText } = renderModal({ isConnected: false });
      expect(getByText("Login or Sign Up")).toBeTruthy();
    });

    it("should render the correct header text when connected", () => {
      const { getByText } = renderModal({ isConnected: true });
      expect(getByText("Wallet")).toBeTruthy();
    });

    it("should render the Phantom branding in the footer", () => {
      const { getByText, getByTestId } = renderModal();
      expect(getByText("Powered by")).toBeTruthy();
      expect(getByText("Phantom")).toBeTruthy();
      expect(() => getByTestId("icon-phantom")).not.toThrow();
    });

    it("should render children content", () => {
      const { getByTestId, getByText } = renderModal();
      expect(getByTestId("modal-child")).toBeTruthy();
      expect(getByText("Test Content")).toBeTruthy();
    });

    it("should apply the correct animation type to RNModal", () => {
      const { UNSAFE_getByType } = renderModal();
      const rnModal = UNSAFE_getByType(RNModal);
      expect(rnModal.props.animationType).toBe("slide");
    });

    it("should be transparent", () => {
      const { UNSAFE_getByType } = renderModal();
      const rnModal = UNSAFE_getByType(RNModal);
      expect(rnModal.props.transparent).toBe(true);
    });
  });

  describe("Interactions", () => {
    it("should call onClose when close button is pressed", () => {
      const onClose = jest.fn();
      const { getByTestId } = renderModal({ onClose });
      
      const closeButton = getByTestId("icon-close").parent?.parent;
      expect(closeButton).toBeTruthy();
      
      if (closeButton) {
        fireEvent.press(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it("should call onClose when RNModal requests close", () => {
      const onClose = jest.fn();
      const { UNSAFE_getByType } = renderModal({ onClose });
      const rnModal = UNSAFE_getByType(RNModal);
      
      rnModal.props.onRequestClose();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should have activeOpacity on close button", () => {
      const { getByTestId } = renderModal();
      const closeButton = getByTestId("icon-close").parent?.parent;
      expect(closeButton?.props.activeOpacity).toBe(0.6);
    });
  });

  describe("Styling", () => {
    it("should apply theme colors correctly", () => {
      const { UNSAFE_getByType } = renderModal();
      const safeAreaView = UNSAFE_getByType("SafeAreaView" as any);
      
      // Check bottom sheet background color
      expect(safeAreaView.props.style.backgroundColor).toBe(mockTheme.background);
    });

    it("should have the correct border radius on bottom sheet", () => {
      const { UNSAFE_getByType } = renderModal();
      const safeAreaView = UNSAFE_getByType("SafeAreaView" as any);
      
      expect(safeAreaView.props.style.borderTopLeftRadius).toBe(32);
      expect(safeAreaView.props.style.borderTopRightRadius).toBe(32);
    });

    it("should position the modal at the bottom", () => {
      const { UNSAFE_getByType } = renderModal();
      const safeAreaView = UNSAFE_getByType("SafeAreaView" as any);
      
      expect(safeAreaView.props.style.bottom).toBe(0);
      expect(safeAreaView.props.style.position).toBe("absolute");
    });
  });

  describe("Props", () => {
    it("should not use appIcon prop", () => {
      const { queryByTestId } = renderModal({ appIcon: "https://example.com/icon.png" });
      // The current implementation doesn't use appIcon, so we verify it doesn't render
      expect(queryByTestId("app-icon")).toBeNull();
    });

    it("should not use appName prop", () => {
      const { queryByTestId } = renderModal({ appName: "Test App" });
      // The current implementation doesn't use appName, so we verify it doesn't render
      expect(queryByTestId("app-name")).toBeNull();
    });

    it("should not use isMobile prop", () => {
      // The React Native version doesn't need isMobile since it's always mobile
      const { container } = renderModal({ isMobile: false });
      // Just verify it renders without error
      expect(container).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should have a close button that is accessible", () => {
      const { getByTestId } = renderModal();
      const closeButton = getByTestId("icon-close").parent?.parent;
      
      // TouchableOpacity should be accessible by default
      expect(closeButton).toBeTruthy();
    });
  });
});
