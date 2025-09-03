import { DebugLevel } from "@phantom/react-sdk";
import { useDebug } from "../contexts/DebugContext";

export function DebugConsole() {
  const { debugMessages, debugLevel, showDebug, setDebugLevel, setShowDebug, clearDebugMessages } = useDebug();

  return (
    <div className="section">
      <h3>Debug Console</h3>
      <div className="debug-controls">
        <label className="checkbox-label">
          <input type="checkbox" checked={showDebug} onChange={e => setShowDebug(e.target.checked)} />
          <span>Show Debug Messages</span>
        </label>

        <div className="form-group inline">
          <label>Level:</label>
          <select value={debugLevel} onChange={e => setDebugLevel(parseInt(e.target.value) as DebugLevel)}>
            <option value={DebugLevel.ERROR}>ERROR</option>
            <option value={DebugLevel.WARN}>WARN</option>
            <option value={DebugLevel.INFO}>INFO</option>
            <option value={DebugLevel.DEBUG}>DEBUG</option>
          </select>
        </div>

        <button className="small" onClick={clearDebugMessages}>
          Clear
        </button>
      </div>

      <div className="debug-container" style={{ display: showDebug ? "block" : "none" }}>
        {debugMessages
          .filter(i => i.level <= debugLevel)
          .slice(-100)
          .map((msg, index) => {
            const levelClass = DebugLevel[msg.level].toLowerCase();
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();
            // Debug message rendering
            let dataStr = "";
            try {
              dataStr = msg.data ? JSON.stringify(msg.data, null, 2) : "";
            } catch (error) {
              console.error("Error stringifying debug message data:", error);
            }

            return (
              <div key={index} className={`debug-message debug-${levelClass}`}>
                <div className="debug-header">
                  <span className="debug-timestamp">{timestamp}</span>
                  <span className="debug-level">{DebugLevel[msg.level]}</span>
                  <span className="debug-category">{msg.category}</span>
                </div>
                <div className="debug-content">{msg.message}</div>
                {dataStr && <pre className="debug-data">{dataStr}</pre>}
              </div>
            );
          })}
        {debugMessages.length === 0 && (
          <div className="debug-empty">No debug messages yet. Try connecting to see debug output.</div>
        )}
      </div>
    </div>
  );
}
