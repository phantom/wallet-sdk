import * as React from "react";
import type { Phantom } from "@phantom/wallet-sdk";
import { Prism, type SyntaxHighlighterProps } from "react-syntax-highlighter";

import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { WalletControls } from "./WalletControls";
const SyntaxHighlighter = Prism as any as React.FC<SyntaxHighlighterProps>;

interface ElementConfigScreenProps {
  phantom: Phantom | null;
  onBack: () => void;
  children: React.ReactNode;
}

export const ElementConfigScreen: React.FC<ElementConfigScreenProps> = ({ phantom, onBack, children }) => {
  const codeSnippet = `
import { createPhantom } from "@phantom/wallet-sdk";

// Element-based configuration
const phantom = await createPhantom({
  element: "wallet-container", // ID of the container element
  namespace: "element-wallet",
});
  `;

  return (
    <div className="config-screen" id="element-wallet-page">
      <h2>Element-Based Wallet Configuration</h2>
      <div className="code-snippet">
        <h3>Integration Code</h3>
        <SyntaxHighlighter language="typescript" style={docco}>
          {codeSnippet}
        </SyntaxHighlighter>
      </div>

      <p>The wallet will render inside the container below:</p>
      {children}

      <WalletControls phantom={phantom} />

      <button
        className="back-button"
        onClick={() => {
          phantom?.hide();
          onBack();
        }}
      >
        Back to Navigation
      </button>
    </div>
  );
};
