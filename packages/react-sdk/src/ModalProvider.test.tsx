import * as React from "react";
import { render, fireEvent } from "@testing-library/react";
import { ModalProvider } from "./ModalProvider";
import { useModal } from "./ModalContext";
import { usePhantom } from "./PhantomContext";
import { isMobileDevice } from "@phantom/browser-sdk";
import type { ReactNode } from "react";

// Mock dependencies
jest.mock("./PhantomContext", () => ({
  usePhantom: jest.fn(),
}));

jest.mock("@phantom/browser-sdk", () => ({
  isMobileDevice: jest.fn(),
}));

jest.mock("@phantom/wallet-sdk-ui", () => ({
  Modal: ({
    children,
    isVisible,
    onClose,
    appIcon,
    appName,
    isConnected,
    isMobile,
  }: {
    children: ReactNode;
    isVisible: boolean;
    onClose: () => void;
    appIcon?: string;
    appName?: string;
    isConnected?: boolean;
    isMobile?: boolean;
  }) =>
    isVisible ? (
      <div
        data-testid="modal"
        data-isvisible={isVisible}
        data-isconnected={isConnected}
        data-ismobile={isMobile}
        data-appicon={appIcon}
        data-appname={appName}
      >
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

jest.mock("./components/ConnectModalContent", () => ({
  ConnectModalContent: ({ appIcon, appName, onClose }: any) => (
    <div data-testid="connect-content" data-appicon={appIcon} data-appname={appName}>
      <button onClick={onClose} data-testid="connect-close">
        Close Connect
      </button>
    </div>
  ),
}));

jest.mock("./components/ConnectedModalContent", () => ({
  ConnectedModalContent: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="connected-content">
      <button onClick={onClose} data-testid="connected-close">
        Close Connected
      </button>
    </div>
  ),
}));

describe("ModalProvider", () => {
  const mockUsePhantom = usePhantom as jest.MockedFunction<typeof usePhantom>;
  const mockIsMobileDevice = isMobileDevice as jest.MockedFunction<typeof isMobileDevice>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePhantom.mockReturnValue({
      isConnected: false,
      addresses: [],
      sdk: null,
      isConnecting: false,
      isLoading: false,
      errors: {},
      isClient: true,
      user: null,
      theme: {} as any,
      allowedProviders: ["google", "apple"],
      clearError: jest.fn(),
    });
    mockIsMobileDevice.mockReturnValue(false);
  });

  describe("Rendering", () => {
    it("should render children", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <div data-testid="test-child">Test Child</div>
        </ModalProvider>,
      );

      expect(getByTestId("test-child")).toBeInTheDocument();
    });

    it("should not render Modal when closed", () => {
      const { queryByTestId } = render(
        <ModalProvider>
          <div>Test</div>
        </ModalProvider>,
      );

      expect(queryByTestId("modal")).not.toBeInTheDocument();
    });

    it("should render Modal when open", () => {
      const TestComponent = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(getByTestId("modal")).toBeInTheDocument();
    });

    it("should detect mobile device correctly", () => {
      mockIsMobileDevice.mockReturnValue(true);

      const TestComponent = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      const modal = getByTestId("modal");
      expect(modal.dataset.ismobile).toBe("true");
    });

    it("should render ConnectModalContent when not connected", () => {
      const TestComponent = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(getByTestId("connect-content")).toBeInTheDocument();
    });

    it("should render ConnectedModalContent when connected", () => {
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnected: true,
      } as any);

      const TestComponent = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(getByTestId("connected-content")).toBeInTheDocument();
    });

    it("should pass appIcon and appName props", () => {
      const TestComponent = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      const { getByTestId } = render(
        <ModalProvider appIcon="https://example.com/icon.png" appName="Test App">
          <TestComponent />
        </ModalProvider>,
      );

      const modal = getByTestId("modal");
      expect(modal.dataset.appicon).toBe("https://example.com/icon.png");
      expect(modal.dataset.appname).toBe("Test App");

      const connectContent = getByTestId("connect-content");
      expect(connectContent.dataset.appicon).toBe("https://example.com/icon.png");
      expect(connectContent.dataset.appname).toBe("Test App");
    });
  });

  describe("Modal State Management", () => {
    const TestComponent = () => {
      const { isOpened, open, close } = useModal();
      return (
        <div>
          <div data-testid="modal-state">{isOpened ? "open" : "closed"}</div>
          <button onClick={open} data-testid="open-button">
            Open
          </button>
          <button onClick={close} data-testid="close-button">
            Close
          </button>
        </div>
      );
    };

    it("should provide modal context to children", () => {
      const { getByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(getByTestId("modal-state")).toHaveTextContent("closed");
      expect(getByTestId("open-button")).toBeInTheDocument();
      expect(getByTestId("close-button")).toBeInTheDocument();
    });

    it("should open modal when open is called", () => {
      const { getByTestId, queryByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(queryByTestId("modal")).not.toBeInTheDocument();

      fireEvent.click(getByTestId("open-button"));

      expect(getByTestId("modal")).toBeInTheDocument();
      expect(getByTestId("modal-state")).toHaveTextContent("open");
    });

    it("should close modal when close is called", () => {
      const { getByTestId, queryByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      fireEvent.click(getByTestId("open-button"));
      expect(getByTestId("modal")).toBeInTheDocument();

      fireEvent.click(getByTestId("close-button"));
      expect(queryByTestId("modal")).not.toBeInTheDocument();
      expect(getByTestId("modal-state")).toHaveTextContent("closed");
    });

    it("should close modal when Modal onClose is called", () => {
      const { getByTestId, queryByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      fireEvent.click(getByTestId("open-button"));
      fireEvent.click(getByTestId("modal-close"));

      expect(queryByTestId("modal")).not.toBeInTheDocument();
    });

    it("should close modal when content onClose is called", () => {
      const { getByTestId, queryByTestId } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      fireEvent.click(getByTestId("open-button"));
      fireEvent.click(getByTestId("connect-close"));

      expect(queryByTestId("modal")).not.toBeInTheDocument();
    });
  });

  describe("Content Switching", () => {
    it("should switch content when connection status changes", () => {
      const TestComponent = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      const { getByTestId, queryByTestId, rerender } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      // Initially not connected
      expect(getByTestId("connect-content")).toBeInTheDocument();
      expect(queryByTestId("connected-content")).not.toBeInTheDocument();

      // Update connection status
      mockUsePhantom.mockReturnValue({
        ...mockUsePhantom(),
        isConnected: true,
      } as any);

      rerender(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      // Now connected
      expect(queryByTestId("connect-content")).not.toBeInTheDocument();
      expect(getByTestId("connected-content")).toBeInTheDocument();
    });
  });

  describe("Memoization", () => {
    it("should memoize isMobile value", () => {
      const TestComponent = () => {
        const { open } = useModal();
        React.useEffect(() => {
          open();
        }, [open]);
        return null;
      };

      render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(mockIsMobileDevice).toHaveBeenCalledTimes(1);

      // Even if component rerenders, isMobileDevice shouldn't be called again
      render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(mockIsMobileDevice).toHaveBeenCalledTimes(2); // Called once per render
    });

    it("should use stable callback references", () => {
      let openRef: any;
      let closeRef: any;

      const TestComponent = () => {
        const { open, close } = useModal();
        if (!openRef) {
          openRef = open;
          closeRef = close;
        }
        return (
          <div>
            <span data-testid="open-stable">{open === openRef ? "stable" : "changed"}</span>
            <span data-testid="close-stable">{close === closeRef ? "stable" : "changed"}</span>
          </div>
        );
      };

      const { getByTestId, rerender } = render(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(getByTestId("open-stable")).toHaveTextContent("stable");
      expect(getByTestId("close-stable")).toHaveTextContent("stable");

      rerender(
        <ModalProvider>
          <TestComponent />
        </ModalProvider>,
      );

      expect(getByTestId("open-stable")).toHaveTextContent("stable");
      expect(getByTestId("close-stable")).toHaveTextContent("stable");
    });
  });
});
