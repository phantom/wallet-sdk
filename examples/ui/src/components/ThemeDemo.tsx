import { useState } from "react";
import { 
  PhantomUIProvider,
  useAccounts,
  usePhantomUI,
  ConnectionModal,
  TransactionModal
} from "@phantom/react-ui";

interface ThemeConfig {
  theme: "light" | "dark" | "auto";
  customTheme: Record<string, string>;
}

function ThemeDemoContent() {
  const { accounts } = useAccounts();
  const { showConnectionModal, showTransactionModal } = usePhantomUI();

  const isConnected = accounts.length > 0;

  const handleShowConnectionModal = () => {
    showConnectionModal();
  };

  const handleShowTransactionModal = () => {
    if (isConnected && accounts[0]) {
      // Create a simple transaction for demo
      showTransactionModal({
        transaction: {
          feePayer: accounts[0].publicKey,
          recentBlockhash: "11111111111111111111111111111111", // Demo blockhash
          instructions: [],
        },
      });
    }
  };

  return (
    <div className="demo-section">
      <h2>Theme Configuration Demo</h2>
      <p>Test different theme configurations and custom styling options.</p>

      <div className="demo-controls">
        <button onClick={handleShowConnectionModal}>
          Show Connection Modal
        </button>
        
        <button 
          onClick={handleShowTransactionModal}
          disabled={!isConnected}
        >
          Show Transaction Modal
        </button>
      </div>

      <div className="status-display">
        <h3>Current Account</h3>
        <pre>{JSON.stringify({
          isConnected,
          address: accounts[0]?.address || null,
        }, null, 2)}</pre>
      </div>

      <ConnectionModal />
      <TransactionModal />
    </div>
  );
}

export default function ThemeDemo() {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    theme: "light",
    customTheme: {
      "--phantom-ui-primary": "#5865f2",
      "--phantom-ui-background": "#ffffff",
      "--phantom-ui-text": "#000000",
      "--phantom-ui-border": "#e0e0e0",
      "--phantom-ui-border-radius": "8px",
    }
  });

  const presetThemes = {
    default: {
      "--phantom-ui-primary": "#5865f2",
      "--phantom-ui-background": "#ffffff",
      "--phantom-ui-text": "#000000",
      "--phantom-ui-border": "#e0e0e0",
      "--phantom-ui-border-radius": "8px",
    },
    dark: {
      "--phantom-ui-primary": "#7289da",
      "--phantom-ui-background": "#2f3136",
      "--phantom-ui-text": "#ffffff",
      "--phantom-ui-border": "#4f545c",
      "--phantom-ui-border-radius": "8px",
    },
    purple: {
      "--phantom-ui-primary": "#9f4f96",
      "--phantom-ui-background": "#faf7ff",
      "--phantom-ui-text": "#2d1b69",
      "--phantom-ui-border": "#e0d4fd",
      "--phantom-ui-border-radius": "12px",
    },
    green: {
      "--phantom-ui-primary": "#00d4aa",
      "--phantom-ui-background": "#f0fffc",
      "--phantom-ui-text": "#003d35",
      "--phantom-ui-border": "#b8f5ec",
      "--phantom-ui-border-radius": "6px",
    }
  };

  const applyPreset = (presetName: keyof typeof presetThemes) => {
    setThemeConfig(prev => ({
      ...prev,
      customTheme: presetThemes[presetName]
    }));
  };

  const updateThemeProperty = (property: string, value: string) => {
    setThemeConfig(prev => ({
      ...prev,
      customTheme: {
        ...prev.customTheme,
        [property]: value
      }
    }));
  };

  return (
    <div>
      <div className="config-section">
        <h3>Base Theme</h3>
        <div className="config-options">
          <label>
            Theme Mode:
            <select 
              value={themeConfig.theme}
              onChange={(e) => setThemeConfig(prev => ({
                ...prev,
                theme: e.target.value as "light" | "dark" | "auto"
              }))}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="config-section">
        <h3>Theme Presets</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {Object.keys(presetThemes).map(preset => (
            <button 
              key={preset}
              onClick={() => applyPreset(preset as keyof typeof presetThemes)}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="config-section">
        <h3>Custom Theme Variables</h3>
        <div className="config-options">
          {Object.entries(themeConfig.customTheme).map(([property, value]) => (
            <label key={property}>
              {property}:
              <input 
                type="text"
                value={value}
                onChange={(e) => updateThemeProperty(property, e.target.value)}
                placeholder="CSS value"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="status-display">
        <h3>Current Theme Configuration</h3>
        <pre>{JSON.stringify(themeConfig, null, 2)}</pre>
      </div>

      <PhantomUIProvider 
        theme={themeConfig.theme} 
        customTheme={themeConfig.customTheme}
      >
        <ThemeDemoContent />
      </PhantomUIProvider>
    </div>
  );
}