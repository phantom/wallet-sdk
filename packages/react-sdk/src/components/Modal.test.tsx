import { render, fireEvent } from "@testing-library/react";
import { Modal, type ModalProps } from "@phantom/wallet-sdk-ui";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

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

describe("Modal Component (Web)", () => {
  const defaultProps: ModalProps = {
    isVisible: true,
    onClose: jest.fn(),
    children: <div data-testid="modal-child">Test Content</div>,
  };

  // Mock ResizeObserver
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });
  global.ResizeObserver = mockResizeObserver as any;

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
      expect(getByTestId("modal-child")).toBeInTheDocument();
    });

    it("should not render when isVisible is false", () => {
      const { container } = renderModal({ isVisible: false });
      expect(container.firstChild).toBeNull();
    });

    it("should render children content", () => {
      const { getByTestId, getByText } = renderModal();
      expect(getByTestId("modal-child")).toBeInTheDocument();
      expect(getByText("Test Content")).toBeInTheDocument();
    });

    // Styling details are covered in the UI package; here we focus on
    // behavioral aspects (visibility, callbacks, children, etc.).
  });

  describe("Interactions", () => {
    it("should call onClose when clicking outside the modal", () => {
      const onClose = jest.fn();
      const { container } = renderModal({ onClose });

      const overlay = container.firstChild as HTMLElement;
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when clicking inside the modal", () => {
      const onClose = jest.fn();
      const { getByTestId } = renderModal({ onClose });

      fireEvent.click(getByTestId("modal-child"));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Props", () => {
    it("should not render appIcon even if provided", () => {
      const { queryByRole } = renderModal({
        appIcon: "https://example.com/icon.png",
      });
      // The current implementation doesn't use appIcon
      expect(queryByRole("img", { name: /app icon/i })).not.toBeInTheDocument();
    });

    it("should not render appName even if provided", () => {
      const { queryByText } = renderModal({ appName: "Test App" });
      // The current implementation doesn't use appName
      expect(queryByText("Test App")).not.toBeInTheDocument();
    });
  });

  // Theme and low-level accessibility styling are owned by the UI package and
  // tested there; we intentionally avoid asserting exact inline styles here to
  // keep these tests stable.
});
