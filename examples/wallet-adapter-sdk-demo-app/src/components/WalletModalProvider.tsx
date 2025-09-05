import { useState, type FC, type ReactNode } from "react";
import { WalletModalContext, type WalletModalProps } from "@solana/wallet-adapter-react-ui";
import { WalletModal } from "./WalletModal";

export interface WalletModalProviderProps extends WalletModalProps {
  children: ReactNode;
}

export const WalletModalProvider: FC<WalletModalProviderProps> = ({ children, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <WalletModalContext.Provider
      value={{
        visible,
        setVisible,
      }}
    >
      {children}
      {visible && <WalletModal {...props} />}
    </WalletModalContext.Provider>
  );
};
