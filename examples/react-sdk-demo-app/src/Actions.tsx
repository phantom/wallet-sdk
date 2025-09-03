import "./Actions.css";
import { SDKActions } from "./SDKActions";
import { DebugConsole } from "./components/DebugConsole";
import { type ProviderType } from "@phantom/react-sdk";

interface ActionsProps {
  providerType: ProviderType;
}

export function Actions({ providerType }: ActionsProps) {
  return (
    <div id="app">
      <h1>Phantom React SDK Demo</h1>

      <div className="main-layout">
        <div className="left-panel">
          <SDKActions providerType={providerType} onDestroySDK={() => window.location.reload()} />
        </div>

        <div className="right-panel">
          <DebugConsole />
        </div>
      </div>
    </div>
  );
}
