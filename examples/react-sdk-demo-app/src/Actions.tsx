import "./Actions.css";
import { SDKActions } from "./SDKActions";
import { DebugConsole } from "./components/DebugConsole";

export function Actions() {
  return (
    <div id="app">
      <h1>Phantom React SDK Demo</h1>

      <div className="main-layout">
        <div className="left-panel">
          <SDKActions />
        </div>

        <div className="right-panel">
          <DebugConsole />
        </div>
      </div>
    </div>
  );
}
