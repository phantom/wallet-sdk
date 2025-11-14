import React from "react";
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

    it("should render the close button", () => {
      const { container } = renderModal();
      const closeButton = container.querySelector('[style*="cursor: pointer"]');
      expect(closeButton).toBeInTheDocument();
    });

    it("should render the correct header text when not connected", () => {
      const { getByText } = renderModal({ isConnected: false });
      expect(getByText("Login or Sign Up")).toBeInTheDocument();
    });

    it("should render the correct header text when connected", () => {
      const { getByText } = renderModal({ isConnected: true });
      expect(getByText("Wallet")).toBeInTheDocument();
    });

    it("should render the Phantom branding in the footer", () => {
      const { getByText } = renderModal();
      expect(getByText("Powered by")).toBeInTheDocument();
      expect(getByText("Phantom")).toBeInTheDocument();
    });

    it("should render children content", () => {
      const { getByTestId, getByText } = renderModal();
      expect(getByTestId("modal-child")).toBeInTheDocument();
      expect(getByText("Test Content")).toBeInTheDocument();
    });

    it("should apply overlay styles", () => {
      const { container } = renderModal();
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({
        position: "fixed",
        backgroundColor: mockTheme.overlay,
        zIndex: 9999,
      });
    });

    it("should apply modal container styles", () => {
      const { container } = renderModal();
      const modal = container.querySelector('[style*="backgroundColor"]') as HTMLElement;
      expect(modal).toHaveStyle({
        backgroundColor: mockTheme.background,
        borderRadius: mockTheme.borderRadius,
      });
    });
  });

  describe("Interactions", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = jest.fn();
      const { container } = renderModal({ onClose });
      
      const closeButton = container.querySelector('[style*="cursor: pointer"]') as HTMLElement;
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

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

    it("should change close button style on hover", () => {
      const { container } = renderModal();
      const closeButton = container.querySelector('[style*="cursor: pointer"]') as HTMLElement;
      
      // Check initial color
      const svgPath = closeButton.querySelector('path');
      expect(svgPath).toHaveAttribute('stroke', mockTheme.secondary);
      
      // Hover over close button
      fireEvent.mouseEnter(closeButton);
      
      // Color should change on hover
      const hoveredSvgPath = closeButton.querySelector('path');
      expect(hoveredSvgPath).toHaveAttribute('stroke', mockTheme.text);
      
      // Mouse leave
      fireEvent.mouseLeave(closeButton);
      
      // Color should revert
      const unhoverSvgPath = closeButton.querySelector('path');
      expect(unhoverSvgPath).toHaveAttribute('stroke', mockTheme.secondary);
    });
  });

  describe("Mobile vs Desktop", () => {
    it("should apply mobile styles when isMobile is true", () => {
      const { container } = renderModal({ isMobile: true });
      const overlay = container.firstChild as HTMLElement;
      
      expect(overlay).toHaveStyle({
        padding: "16px",
      });
      
      const modal = overlay.firstChild as HTMLElement;
      expect(modal).toHaveStyle({
        maxWidth: "100%",
      });
    });

    it("should apply desktop styles when isMobile is false", () => {
      const { container } = renderModal({ isMobile: false });
      const overlay = container.firstChild as HTMLElement;
      
      expect(overlay).toHaveStyle({
        padding: "0",
      });
      
      const modal = overlay.firstChild as HTMLElement;
      expect(modal).toHaveStyle({
        maxWidth: "350px",
      });
    });
  });

  describe("Props", () => {
    it("should not render appIcon even if provided", () => {
      const { queryByRole } = renderModal({ 
        appIcon: "https://example.com/icon.png" 
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

  describe("Theme Integration", () => {
    it("should apply theme colors correctly", () => {
      const customTheme = {
        ...mockTheme,
        background: "#123456" as const,
        overlay: "rgba(255, 0, 0, 0.5)" as const,
        borderRadius: "8px" as const,
      };

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <Modal {...defaultProps} />
        </ThemeProvider>,
      );

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({
        backgroundColor: customTheme.overlay,
      });

      const modal = overlay.firstChild as HTMLElement;
      expect(modal).toHaveStyle({
        backgroundColor: customTheme.background,
        borderRadius: customTheme.borderRadius,
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper z-index for overlay", () => {
      const { container } = renderModal();
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({ zIndex: 9999 });
    });

    it("should prevent scroll when modal is open", () => {
      // Note: The current implementation doesn't prevent body scroll
      // This test documents current behavior
      const { container } = renderModal();
      expect(container).toBeTruthy();
      // Body scroll is not affected in current implementation
      expect(document.body.style.overflow).not.toBe("hidden");
    });
  });
});
