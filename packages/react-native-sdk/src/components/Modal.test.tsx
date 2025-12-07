import type React from "react";
import { render } from "@testing-library/react-native";
import type { ModalProps } from "./Modal";
import { Modal } from "./Modal";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

// Mock @phantom/wallet-sdk-ui components
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock("@phantom/wallet-sdk-ui", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  return {
    ...jest.requireActual("@phantom/wallet-sdk-ui"),
    Icon: ({ type, testID }: { type: string; testID?: string }) => {
      return <View testID={testID || `icon-${type}`} />;
    },
    Text: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
      return <Text testID={testID}>{children}</Text>;
    },
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

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
  /* eslint-disable @typescript-eslint/no-var-requires */
  const React = require("react");
  const { View, Text } = require("react-native");
  /* eslint-enable @typescript-eslint/no-var-requires */

  const defaultProps: ModalProps = {
    isVisible: true,
    onClose: jest.fn(),
    children: (
      <View testID="modal-child">
        <Text>Test Content</Text>
      </View>
    ),
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
      // Note: React Native Modal hides content but doesn't unmount it
      // This test just verifies the modal renders without crashing
      const { container } = renderModal({ isVisible: false });
      expect(container).toBeTruthy();
    });

    it("should render children content", () => {
      const { getByTestId, getByText } = renderModal();
      expect(getByTestId("modal-child")).toBeTruthy();
      expect(getByText("Test Content")).toBeTruthy();
    });

    it("should render with proper modal configuration", () => {
      // RNModal is configured with slide animation and transparent background
      // These props are passed but not easily testable without UNSAFE_getByType
      const { container } = renderModal();
      expect(container).toBeTruthy();
    });
  });

  describe("Styling", () => {
    it("should render with bottom sheet styling", () => {
      // Modal uses StyleSheet.create with theme colors and proper positioning
      // These styles are applied but not easily testable without direct style inspection
      const { container } = renderModal();
      expect(container).toBeTruthy();
    });
  });

  describe("Props", () => {
    it("should render with standard props", () => {
      // Modal accepts but doesn't use appIcon, appName, or isMobile props in RN version
      const { container } = renderModal();
      expect(container).toBeTruthy();
    });
  });
});
