import type React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import type { ConnectModalContentProps } from "./ConnectModalContent";
import { ConnectModalContent } from "./ConnectModalContent";
import { usePhantom } from "../PhantomContext";
import { useConnect } from "../hooks/useConnect";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

// Mock dependencies
jest.mock("../PhantomContext");
jest.mock("../hooks/useConnect");
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock("@phantom/wallet-sdk-ui", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");

  return {
    ...jest.requireActual("@phantom/wallet-sdk-ui"),
    Button: (props: any) => {
      const { children, onClick, disabled, isLoading, testID, fullWidth } = props;

      // Use View instead of TouchableOpacity to properly expose custom props
      return (
        <View
          testID={testID || "button"}
          onPress={onClick}
          disabled={disabled}
          isLoading={isLoading}
          fullWidth={fullWidth}
          accessible={!disabled}
        >
          <Text>{children}</Text>
        </View>
      );
    },
    Icon: ({ type }: { type: string }) => {
      return <View testID={`icon-${type}`} />;
    },
    Text: ({ children, style }: { children: React.ReactNode; style?: any }) => {
      return <Text style={style}>{children}</Text>;
    },
    ModalHeader: ({
      title,
      onClose,
      goBack,
      onGoBack,
    }: {
      title: string;
      onClose?: () => void;
      goBack?: boolean;
      onGoBack?: () => void;
    }) => {
      return (
        <View testID="modal-header">
          {goBack && onGoBack && (
            <TouchableOpacity testID="modal-header-back" onPress={onGoBack}>
              <Text>Back</Text>
            </TouchableOpacity>
          )}
          <Text testID="modal-header-title">{title}</Text>
          {onClose && (
            <TouchableOpacity testID="modal-header-close" onPress={onClose}>
              <Text>×</Text>
            </TouchableOpacity>
          )}
        </View>
      );
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

describe("ConnectModalContent", () => {
  const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;
  const mockUseConnect = useConnect as jest.MockedFunction<typeof useConnect>;
  const mockConnect = jest.fn();

  const defaultProps: ConnectModalContentProps = {
    onClose: jest.fn(),
  };

  const renderComponent = (props: Partial<ConnectModalContentProps> = {}) => {
    return render(
      <ThemeProvider theme={mockTheme}>
        <ConnectModalContent {...defaultProps} {...props} />
      </ThemeProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Make mockConnect return a resolved promise by default
    mockConnect.mockResolvedValue(undefined);
    mockUsePhantom.mockReturnValue({
      isConnecting: false,
      allowedProviders: ["google", "apple"],
      isConnected: false,
      addresses: [],
      walletId: null,
      sdk: null,
      disconnect: jest.fn(),
      getAddresses: jest.fn().mockReturnValue([]),
      isDisconnecting: false,
      config: {} as any,
      currentProviderType: null,
    });
    mockUseConnect.mockReturnValue({
      connect: mockConnect,
      isConnecting: false,
      error: null,
    });
  });

  describe("Provider Buttons", () => {
    it("should render Google button when google is in allowedProviders", () => {
      const { getByTestId, getByText } = renderComponent();

      expect(() => getByTestId("icon-google")).not.toThrow();
      expect(getByText("Continue with Google")).toBeTruthy();
    });

    it("should render Apple button when apple is in allowedProviders", () => {
      const { getByTestId, getByText } = renderComponent();

      expect(() => getByTestId("icon-apple")).not.toThrow();
      expect(getByText("Continue with Apple")).toBeTruthy();
    });

    it("should not render buttons for providers not in allowedProviders", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google"], // Only google
      } as any);

      const { getByTestId, queryByTestId, queryByText } = renderComponent();

      expect(() => getByTestId("icon-google")).not.toThrow();
      expect(queryByTestId("icon-apple")).toBeNull();
      expect(queryByText("Continue with Apple")).toBeNull();
    });

    it("should render multiple provider buttons when multiple providers allowed", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google", "apple"],
      } as any);

      const { getByTestId } = renderComponent();

      expect(() => getByTestId("icon-google")).not.toThrow();
      expect(() => getByTestId("icon-apple")).not.toThrow();
    });
  });

  describe("Button Interactions", () => {
    it("should call connect with google provider when Google button is clicked", async () => {
      mockConnect.mockResolvedValue({ status: "completed" });
      const onClose = jest.fn();

      const { getByText } = renderComponent({ onClose });
      const googleButton = getByText("Continue with Google").parent;

      fireEvent.press(googleButton!);

      expect(mockConnect).toHaveBeenCalledWith({ provider: "google" });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should call connect with apple provider when Apple button is clicked", async () => {
      mockConnect.mockResolvedValue({ status: "completed" });
      const onClose = jest.fn();

      const { getByText } = renderComponent({ onClose });
      const appleButton = getByText("Continue with Apple").parent;

      fireEvent.press(appleButton!);

      expect(mockConnect).toHaveBeenCalledWith({ provider: "apple" });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should call connect with correct provider when button clicked", async () => {
      const { getByText } = renderComponent();
      const googleButton = getByText("Continue with Google").parent;

      fireEvent.press(googleButton!);

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith({ provider: "google" });
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error message when connect fails", async () => {
      const errorMessage = "Failed to connect to Google";
      mockConnect.mockRejectedValue(new Error(errorMessage));

      const { getByText } = renderComponent();
      const googleButton = getByText("Continue with Google").parent;

      fireEvent.press(googleButton!);

      await waitFor(() => {
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });

    it("should clear error when retrying with different provider", async () => {
      mockConnect.mockRejectedValueOnce(new Error("Failed to connect")).mockResolvedValueOnce({ status: "completed" });

      const { getByText, queryByText } = renderComponent();

      // First attempt fails
      fireEvent.press(getByText("Continue with Google").parent!);

      await waitFor(() => {
        expect(getByText("Failed to connect")).toBeTruthy();
      });

      // Second attempt with different provider
      fireEvent.press(getByText("Continue with Apple").parent!);

      await waitFor(() => {
        expect(queryByText("Failed to connect")).toBeNull();
      });
    });

    it("should not call onClose when connect fails", async () => {
      mockConnect.mockRejectedValue(new Error("Connection failed"));
      const onClose = jest.fn();

      const { getByText } = renderComponent({ onClose });
      fireEvent.press(getByText("Continue with Google").parent!);

      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading UI when context isConnecting is true", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnecting: true,
      } as any);

      const { getByTestId } = renderComponent();

      expect(() => getByTestId("activity-indicator")).not.toThrow();
    });

    it("should show loading state when context isConnecting is true", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnecting: true,
      } as any);

      const { getByTestId, queryByTestId } = renderComponent();

      // Should show activity indicator
      expect(getByTestId("activity-indicator")).toBeTruthy();
      // Buttons should not be rendered when loading
      expect(queryByTestId("button")).toBeNull();
    });
  });

  describe("App Icon", () => {
    it("should render app icon when provided", () => {
      const { getByTestId } = renderComponent({ appIcon: "https://example.com/icon.png" });

      const appIcon = getByTestId("app-icon");
      expect(appIcon.props.source).toEqual({ uri: "https://example.com/icon.png" });
    });

    it("should not render app icon when not provided", () => {
      const { queryByTestId } = renderComponent();

      expect(queryByTestId("app-icon")).toBeNull();
    });
  });

  describe("Welcome Text", () => {
    // The React Native modal header copy is rendered by the Modal wrapper,
    // not this content component, so we avoid asserting specific marketing
    // text here to keep the test focused on behavior.
  });

  describe("Edge Cases", () => {
    it("should handle empty allowedProviders array", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: [],
      } as any);

      const { queryByTestId } = renderComponent();

      expect(queryByTestId("icon-google")).toBeNull();
      expect(queryByTestId("icon-apple")).toBeNull();
    });

    it("should handle non-Error objects in catch block", async () => {
      mockConnect.mockRejectedValue("String error");

      const { getByText } = renderComponent();
      fireEvent.press(getByText("Continue with Google").parent!);

      await waitFor(() => {
        expect(getByText("String error")).toBeTruthy();
      });
    });
  });
});
