import React from "react";
import { Phantom } from "../../../sdk/src/index";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { WalletControls } from "./WalletControls";

interface NormalConfigScreenProps {
  phantom: Phantom | null;
  onBack: () => void;
}

export const NormalConfigScreen: React.FC<NormalConfigScreenProps> = ({
  phantom,
  onBack,
}) => {
  const codeSnippet = `
import { createPhantom, Position } from "@phantom/sdk";

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
