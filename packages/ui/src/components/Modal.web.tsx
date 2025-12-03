import { type CSSProperties, type ReactNode, useRef, useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";

export interface ModalProps {
  appIcon?: string;
  appName?: string;
  isVisible: boolean;
  onClose: () => void;
  isMobile?: boolean;
  children: ReactNode;
}

export function Modal({
  appIcon: _appIcon,
  appName: _appName,
  isVisible,
  onClose,
  isMobile = false,
  children,
}: ModalProps) {
  const theme = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (!isVisible || !contentRef.current) return;

    // Measure content height
    const measureHeight = () => {
      if (contentRef.current) {
        const height = contentRef.current.scrollHeight;
        setContentHeight(height);
      }
    };

    // Measure on mount and when children change
    measureHeight();

    // Use ResizeObserver to detect content size changes
    const resizeObserver = new ResizeObserver(() => {
      measureHeight();
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isVisible, children]);

  if (!isVisible) return null;

  // Styles
  const overlayStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: isMobile ? "16px" : "0",
  };

  const modalStyle: CSSProperties = {
    backgroundColor: theme.background,
    borderRadius: theme.borderRadius,
    maxWidth: isMobile ? "100%" : "350px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    position: "relative" as const,
    overflow: "hidden",
    transition: "max-width 0.1s ease-in-out",
  };

  const modalContentWrapperStyle: CSSProperties = {
    height: typeof contentHeight === "number" ? `${contentHeight}px` : "auto",
    transition: "height 0.15s ease-in-out",
    overflow: "hidden",
  };

  const modalContentStyle: CSSProperties = {
    transition: "opacity 0.15s ease-in-out",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalContentWrapperStyle}>
          <div ref={contentRef} style={modalContentStyle}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
