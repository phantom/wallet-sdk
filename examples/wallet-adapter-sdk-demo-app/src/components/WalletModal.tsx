import { PhantomSDKWalletName } from "@phantom/sdk-wallet-adapter";
import type { WalletName } from "@solana/wallet-adapter-base";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { CSSProperties, FC, MouseEvent, MouseEventHandler, PropsWithChildren, ReactElement } from "react";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface WalletModalProps {
  className?: string;
  container?: string;
}

export const WalletModal: FC<WalletModalProps> = ({ className = "", container = "body" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { wallets, select } = useWallet();
  const { setVisible } = useWalletModal();
  const [fadeIn, setFadeIn] = useState(false);
  const [portal, setPortal] = useState<Element | null>(null);

  const [[invisibleWallet, listedWallets]] = useMemo(() => {
    let invisibleWallet: Wallet | null = null;
    const installed: Wallet[] = [];
    const notInstalled: Wallet[] = [];

    for (const wallet of wallets) {
      if (wallet.adapter.name === PhantomSDKWalletName) {
        invisibleWallet = wallet;
        invisibleWallet.adapter.icon =
          "https://developers.google.com/static/identity/images/branding_guideline_sample_lt_sq_sl.svg";
        continue;
      }
      if (wallet.readyState === WalletReadyState.Installed) {
        installed.push(wallet);
      } else {
        notInstalled.push(wallet);
      }
    }

    return installed.length ? [[invisibleWallet, installed], notInstalled] : [[invisibleWallet, []], notInstalled];
  }, [wallets]);

  const hideModal = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => setVisible(false), 150);
  }, [setVisible]);

  const handleClose = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      hideModal();
    },
    [hideModal],
  );

  const handleWalletClick = useCallback(
    (event: MouseEvent, walletName: WalletName) => {
      select(walletName);
      handleClose(event);
    },
    [select, handleClose],
  );

  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      const node = ref.current;
      if (!node) return;

      // here we query all focusable elements
      const focusableElements = node.querySelectorAll("button");
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const firstElement = focusableElements[0]!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lastElement = focusableElements[focusableElements.length - 1]!;

      if (event.shiftKey) {
        // if going backward by pressing tab and firstElement is active, shift focus to last focusable element
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        // if going forward by pressing tab and lastElement is active, shift focus to first focusable element
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    },
    [ref],
  );

  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideModal();
      } else if (event.key === "Tab") {
        handleTabKey(event);
      }
    };

    // Get original overflow
    const { overflow } = window.getComputedStyle(document.body);
    // Hack to enable fade in animation after mount
    setTimeout(() => setFadeIn(true), 0);
    // Prevent scrolling on mount
    document.body.style.overflow = "hidden";
    // Listen for keydown events
    window.addEventListener("keydown", handleKeyDown, false);

    return () => {
      // Re-enable scrolling when component unmounts
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown, false);
    };
  }, [hideModal, handleTabKey]);

  useLayoutEffect(() => setPortal(document.querySelector(container)), [container]);

  return (
    portal &&
    createPortal(
      <div
        aria-labelledby="wallet-adapter-modal-title"
        aria-modal="true"
        className={`wallet-adapter-modal ${fadeIn && "wallet-adapter-modal-fade-in"} ${className}`}
        ref={ref}
        role="dialog"
      >
        <div className="wallet-adapter-modal-container">
          <div className="wallet-adapter-modal-wrapper">
            <button onClick={handleClose} className="wallet-adapter-modal-button-close">
              <svg width="14" height="14">
                <path d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z" />
              </svg>
            </button>
            <h1 className="wallet-adapter-modal-title">Connect or create wallet</h1>

            <ul className="wallet-adapter-modal-list">
              {invisibleWallet && (
                <WalletListItem
                  handleClick={event => handleWalletClick(event, invisibleWallet.adapter.name)}
                  wallet={invisibleWallet}
                  name="Login with Google"
                />
              )}
            </ul>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                margin: "8px 0",
                width: "100%",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              <hr style={{ flex: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />
              <div>OR</div>
              <hr style={{ flex: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />
            </div>

            <ul className="wallet-adapter-modal-list">
              {listedWallets.map(wallet => (
                <WalletListItem
                  key={wallet.adapter.name}
                  handleClick={event => handleWalletClick(event, wallet.adapter.name)}
                  wallet={wallet}
                />
              ))}
            </ul>
          </div>
        </div>
        <div className="wallet-adapter-modal-overlay" onMouseDown={handleClose} />
      </div>,
      portal,
    )
  );
};

interface WalletListItemProps {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  tabIndex?: number;
  wallet: Wallet;
  name?: string;
}

function WalletListItem({ handleClick, tabIndex, wallet, name = wallet.adapter.name }: WalletListItemProps) {
  return (
    <li>
      <Button
        onClick={handleClick}
        startIcon={<img src={wallet.adapter.icon} alt={`${wallet.adapter.name} icon`} />}
        tabIndex={tabIndex}
      >
        {name}
      </Button>
    </li>
  );
}

type ButtonProps = PropsWithChildren<{
  className?: string;
  disabled?: boolean;
  endIcon?: ReactElement;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  startIcon?: ReactElement;
  style?: CSSProperties;
  tabIndex?: number;
}>;

function Button(props: ButtonProps) {
  return (
    <button
      disabled={props.disabled}
      style={props.style}
      onClick={props.onClick}
      tabIndex={props.tabIndex || 0}
      type="button"
    >
      {props.startIcon && <i className="wallet-adapter-button-start-icon">{props.startIcon}</i>}
      {props.children}
      {props.endIcon && <i className="wallet-adapter-button-end-icon">{props.endIcon}</i>}
    </button>
  );
}

interface WalletModalContextState {
  visible: boolean;
  setVisible: (open: boolean) => void;
}

const DEFAULT_CONTEXT = {
  setVisible(_open: boolean) {
    console.error(constructMissingProviderErrorMessage("call", "setVisible"));
  },
  visible: false,
};
Object.defineProperty(DEFAULT_CONTEXT, "visible", {
  get() {
    console.error(constructMissingProviderErrorMessage("read", "visible"));
    return false;
  },
});

function constructMissingProviderErrorMessage(action: string, valueName: string) {
  return (
    "You have tried to " +
    ` ${action} "${valueName}"` +
    " on a WalletModalContext without providing one." +
    " Make sure to render a WalletModalProvider" +
    " as an ancestor of the component that uses " +
    "WalletModalContext"
  );
}

export const WalletModalContext = createContext<WalletModalContextState>(DEFAULT_CONTEXT as WalletModalContextState);

export function useWalletModal(): WalletModalContextState {
  return useContext(WalletModalContext);
}
