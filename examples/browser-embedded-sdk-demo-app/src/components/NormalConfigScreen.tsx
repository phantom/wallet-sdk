import * as React from "react";
import type { Phantom } from "@phantom/wallet-sdk";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { WalletControls } from "./WalletControls";
import { Prism, type SyntaxHighlighterProps } from "react-syntax-highlighter";
const SyntaxHighlighter = Prism as any as React.FC<SyntaxHighlighterProps>;

interface NormalConfigScreenProps {
  phantom: Phantom | null;
  onBack: () => void;
}

export const NormalConfigScreen: React.FC<NormalConfigScreenProps> = ({ phantom, onBack }) => {
  const codeSnippet = `
import { createPhantom, Position } from "@phantom/wallet-sdk";

// Normal configuration (bottom right)
const phantom = await createPhantom({
  position: Position.bottomRight,
  hideLauncherBeforeOnboarded: false,
  namespace: "normal-wallet",
});
  `;

  return (
    <div className="config-screen">
      <h2>Normal Wallet Configuration</h2>
      <div className="code-snippet">
        <h3>Integration Code</h3>
        <SyntaxHighlighter language="typescript" style={docco}>
          {codeSnippet}
        </SyntaxHighlighter>
      </div>

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
