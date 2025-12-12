import * as React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ConnectModalContent, type ConnectModalContentProps } from "./ConnectModalContent";
import { usePhantom } from "../PhantomContext";
import { useConnect } from "../hooks/useConnect";
import { useIsExtensionInstalled } from "../hooks/useIsExtensionInstalled";
import { useIsPhantomLoginAvailable } from "../hooks/useIsPhantomLoginAvailable";
import { useDiscoveredWallets } from "../hooks/useDiscoveredWallets";
import { isMobileDevice, getDeeplinkToPhantom } from "@phantom/browser-sdk";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

// Mock dependencies
jest.mock("../PhantomContext");
jest.mock("../hooks/useConnect");
jest.mock("../hooks/useIsExtensionInstalled");
jest.mock("../hooks/useIsPhantomLoginAvailable");
jest.mock("../hooks/useDiscoveredWallets");
jest.mock("@phantom/browser-sdk", () => ({
  isMobileDevice: jest.fn(),
  getDeeplinkToPhantom: jest.fn(),
}));
jest.mock("@phantom/wallet-sdk-ui", () => ({
  ...jest.requireActual("@phantom/wallet-sdk-ui"),
  Button: ({ children, onClick, disabled, isLoading, centered, fullWidth: _fullWidth, ...rest }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-loading={isLoading}
      data-centered={centered}
      {...rest}
    >
      {children}
    </button>
  ),
  Icon: ({ type }: { type: string }) => <span data-testid={`icon-${type}`}>{type}</span>,
  BoundedIcon: ({ type }: { type: string }) => <span data-testid={`bounded-icon-${type}`}>{type}</span>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  hexToRgba: (_hex: string, opacity: number) => `rgba(255, 0, 0, ${opacity})`,
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
  }) => (
    <div data-testid="modal-header">
      {goBack && onGoBack && (
        <button data-testid="modal-header-back" onClick={onGoBack}>
          Back
        </button>
      )}
      <span data-testid="modal-header-title">{title}</span>
      {onClose && (
        <button data-testid="modal-header-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  ),
}));

const mockTheme = {
  background: "#ffffff" as const,
  text: "#000000" as const,
  secondary: "#666666" as const,
  aux: "#cccccc" as const,
  overlay: "rgba(0, 0, 0, 0.7)" as const,
  borderRadius: "16px" as const,
  error: "#ff0000" as const,
  success: "#00ff00" as const,
  brand: "#0000ff" as const,
};

describe("ConnectModalContent", () => {
  const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;
  const mockUseConnect = useConnect as jest.MockedFunction<typeof useConnect>;
  const mockUseIsExtensionInstalled = useIsExtensionInstalled as jest.MockedFunction<typeof useIsExtensionInstalled>;
  const mockUseIsPhantomLoginAvailable = useIsPhantomLoginAvailable as jest.MockedFunction<
    typeof useIsPhantomLoginAvailable
  >;
  const mockUseDiscoveredWallets = useDiscoveredWallets as jest.MockedFunction<typeof useDiscoveredWallets>;
  const mockIsMobileDevice = isMobileDevice as jest.MockedFunction<typeof isMobileDevice>;
  const mockGetDeeplinkToPhantom = getDeeplinkToPhantom as jest.MockedFunction<typeof getDeeplinkToPhantom>;

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
    mockUsePhantom.mockReturnValue({
      isLoading: false,
      allowedProviders: ["google", "apple", "deeplink"],
      isConnected: false,
      addresses: [],
      sdk: null,
      isConnecting: false,
      errors: {},
      isClient: true,
      user: null,
      theme: {} as any,
      clearError: jest.fn(),
    });
    mockUseConnect.mockReturnValue({
      connect: mockConnect,
      isConnecting: false,
      isLoading: false,
      error: undefined,
    });
    mockUseIsExtensionInstalled.mockReturnValue({
      isInstalled: false,
      isLoading: false,
    });
    mockUseIsPhantomLoginAvailable.mockReturnValue({
      isAvailable: false,
      isLoading: false,
    });
    mockUseDiscoveredWallets.mockReturnValue({
      wallets: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockIsMobileDevice.mockReturnValue(false);
    mockGetDeeplinkToPhantom.mockReturnValue("phantom://connect");
  });

  describe("Provider Buttons", () => {
    it("should render Google button when google is in allowedProviders", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("icon-google")).toBeInTheDocument();
    });

    it("should render Apple button when apple is in allowedProviders", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("icon-apple")).toBeInTheDocument();
    });

    it("should render only Google icon when both providers are present", () => {
      const { getByTestId, getByText } = renderComponent();

      expect(getByTestId("icon-google")).toBeInTheDocument();
      expect(getByText("Continue with Google")).toBeInTheDocument();
    });

    it("should render Google text when only Google is allowed", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google"],
      } as any);

      const { getByText } = renderComponent();

      expect(getByText("Continue with Google")).toBeInTheDocument();
    });

    it("should not render buttons for providers not in allowedProviders", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google"], // Only google
      } as any);

      const { getByTestId, queryByTestId } = renderComponent();

      expect(getByTestId("icon-google")).toBeInTheDocument();
      expect(queryByTestId("icon-apple")).not.toBeInTheDocument();
    });
  });

  describe("Phantom Login Button", () => {
    it("should render Login with Phantom button when conditions are met", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["phantom"],
      } as any);
      mockUseIsPhantomLoginAvailable.mockReturnValue({
        isAvailable: true,
        isLoading: false,
      });

      const { getByTestId } = renderComponent();

      expect(getByTestId("login-with-phantom-button")).toBeInTheDocument();
    });

    it("should not render Login with Phantom on mobile", () => {
      mockIsMobileDevice.mockReturnValue(true);
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["phantom"],
      } as any);
      mockUseIsPhantomLoginAvailable.mockReturnValue({
        isAvailable: true,
        isLoading: false,
      });

      const { queryByTestId } = renderComponent();

      expect(queryByTestId("login-with-phantom-button")).not.toBeInTheDocument();
    });

    it("should not render when phantom login is not available", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["phantom"],
      } as any);
      mockUseIsPhantomLoginAvailable.mockReturnValue({
        isAvailable: false,
        isLoading: false,
      });

      const { queryByTestId } = renderComponent();

      expect(queryByTestId("login-with-phantom-button")).not.toBeInTheDocument();
    });
  });

  describe("Injected Provider", () => {
    it("should render injected provider button when extension is installed", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["injected"],
      } as any);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: true,
        isLoading: false,
      });
      mockUseDiscoveredWallets.mockReturnValue({
        wallets: [
          {
            id: "phantom",
            name: "Phantom",
            addressTypes: ["Solana"] as any,
          },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId, getAllByText } = renderComponent();

      expect(getByTestId("bounded-icon-phantom")).toBeInTheDocument();
      // "Phantom" appears in both the button and the footer, so use getAllByText
      expect(getAllByText("Phantom").length).toBeGreaterThan(0);
      expect(getByTestId("button")).toBeInTheDocument();
    });

    it("should show divider when multiple providers", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google", "injected"],
      } as any);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: true,
        isLoading: false,
      });

      const { getByText } = renderComponent();

      expect(getByText("OR")).toBeInTheDocument();
    });

    it("should not show divider when only injected provider", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["injected"],
      } as any);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: true,
        isLoading: false,
      });

      const { queryByText } = renderComponent();

      expect(queryByText("OR")).not.toBeInTheDocument();
    });

    it("should render on mobile when extension is detected", () => {
      mockIsMobileDevice.mockReturnValue(true);
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["injected"],
      } as any);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: true,
        isLoading: false,
      });
      mockUseDiscoveredWallets.mockReturnValue({
        wallets: [
          {
            id: "phantom",
            name: "Phantom",
            icon: undefined,
            addressTypes: ["Solana"] as any,
          },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = renderComponent();

      expect(getByTestId("bounded-icon-phantom")).toBeInTheDocument();
    });

    it("should not render on mobile when extension is not detected", () => {
      mockIsMobileDevice.mockReturnValue(true);
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["injected"],
      } as any);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: false,
        isLoading: false,
      });
      mockUseDiscoveredWallets.mockReturnValue({
        wallets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = renderComponent();

      expect(queryByTestId("bounded-icon-phantom")).not.toBeInTheDocument();
    });
  });

  describe("Mobile with Extension Detected (Phantom App Webview)", () => {
    beforeEach(() => {
      mockIsMobileDevice.mockReturnValue(true);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: true,
        isLoading: false,
      });
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        allowedProviders: ["google", "apple", "injected"],
      } as any);
      mockUseDiscoveredWallets.mockReturnValue({
        wallets: [
          {
            id: "phantom",
            name: "Phantom",
            icon: undefined,
            addressTypes: ["Solana"] as any,
          },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it("should show injected Phantom wallet when mobile and extension is detected", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("bounded-icon-phantom")).toBeInTheDocument();
    });

    it("should hide Google login button when mobile and extension is detected", () => {
      const { queryByText } = renderComponent();

      expect(queryByText("Continue with Google")).not.toBeInTheDocument();
    });

    it("should still show Apple button when mobile and extension is detected", () => {
      const { getByText } = renderComponent();

      expect(getByText("Continue with Apple")).toBeInTheDocument();
    });

    it("should allow connecting to Phantom wallet when mobile and extension is detected", async () => {
      mockConnect.mockResolvedValue({} as any);
      const onClose = jest.fn();

      const { getByTestId } = renderComponent({ onClose });
      const phantomIcon = getByTestId("bounded-icon-phantom");
      fireEvent.click(phantomIcon.closest("button")!);

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith({
          provider: "injected",
          walletId: "phantom",
        });
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("Mobile Deeplink", () => {
    it("should show deeplink button on mobile without extension", () => {
      mockIsMobileDevice.mockReturnValue(true);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: false,
        isLoading: false,
      });

      const { getByText } = renderComponent();

      expect(getByText("Open in Phantom App")).toBeInTheDocument();
    });

    it("should not show deeplink button on desktop", () => {
      mockIsMobileDevice.mockReturnValue(false);

      const { queryByText } = renderComponent();

      expect(queryByText("Open in Phantom App")).not.toBeInTheDocument();
    });

    it("should navigate to deeplink URL when clicked", async () => {
      mockIsMobileDevice.mockReturnValue(true);
      mockUseIsExtensionInstalled.mockReturnValue({
        isInstalled: false,
        isLoading: false,
      });

      // Mock connect to resolve successfully (deeplink logic is now in ProviderManager)
      mockConnect.mockResolvedValue({
        addresses: [],
        walletId: undefined,
        authUserId: undefined,
      });

      const { getByText } = renderComponent();
      fireEvent.click(getByText("Open in Phantom App"));

      // Verify that connect was called with deeplink provider
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith({ provider: "deeplink" });
      });
    });
  });

  describe("Button Interactions", () => {
    it("should call connect with google provider when Google button is clicked", async () => {
      mockConnect.mockResolvedValue({ status: "completed" });
      const onClose = jest.fn();

      const { getByTestId } = renderComponent({ onClose });
      const googleIcon = getByTestId("icon-google");
      const googleButton = googleIcon.closest("button");

      fireEvent.click(googleButton!);

      expect(mockConnect).toHaveBeenCalledWith({ provider: "google" });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should disable all buttons when connecting", async () => {
      const { getByTestId, getAllByTestId } = renderComponent();
      const googleIcon = getByTestId("icon-google");
      const googleButton = googleIcon.closest("button");

      fireEvent.click(googleButton!);

      await waitFor(() => {
        const buttons = getAllByTestId("button");
        buttons.forEach(button => {
          expect(button).toBeDisabled();
        });
      });
    });

    it("should show loading state only on clicked button", async () => {
      const { getByTestId } = renderComponent();
      const googleIcon = getByTestId("icon-google");
      const googleButton = googleIcon.closest("button");
      const appleIcon = getByTestId("icon-apple");
      const appleButton = appleIcon.closest("button");

      fireEvent.click(googleButton!);

      await waitFor(() => {
        expect(googleButton?.dataset.loading).toBe("true");
        expect(appleButton?.dataset.loading).toBe("false");
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error message when connect fails", async () => {
      const errorMessage = "Failed to connect to Google";
      mockConnect.mockRejectedValue(new Error(errorMessage));

      const { getByTestId, getByText } = renderComponent();
      const googleIcon = getByTestId("icon-google");
      fireEvent.click(googleIcon.closest("button")!);

      await waitFor(() => {
        expect(getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("should not call onClose when connect fails", async () => {
      mockConnect.mockRejectedValue(new Error("Connection failed"));
      const onClose = jest.fn();

      const { getByTestId } = renderComponent({ onClose });
      const googleIcon = getByTestId("icon-google");
      fireEvent.click(googleIcon.closest("button")!);

      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe("Loading States", () => {
    it("should not render buttons when isLoading", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isLoading: true,
        allowedProviders: ["google", "apple"],
      } as any);

      const { queryByTestId } = renderComponent();

      expect(queryByTestId("icon-google")).not.toBeInTheDocument();
      expect(queryByTestId("icon-apple")).not.toBeInTheDocument();
    });
  });

  describe("App Info Display", () => {
    it("should display app icon when provided", () => {
      const { getByAltText } = renderComponent({
        appIcon: "https://example.com/icon.png",
        appName: "App Icon",
      });

      const img = getByAltText("App Icon") as HTMLImageElement;
      expect(img.src).toBe("https://example.com/icon.png");
    });
  });
});
