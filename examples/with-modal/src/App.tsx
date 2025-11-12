import { useState } from "react";
import { PhantomProvider, type PhantomSDKConfig, AddressType, darkTheme, lightTheme } from "@phantom/react-sdk";
import ConnectExample from "./ConnectExample";

const config: PhantomSDKConfig = {
  providers: ["google", "apple", "phantom", "injected"],
  addressTypes: [AddressType.solana, AddressType.ethereum] as const,
  appId: "7b91c1dd-c3c2-4088-8db3-3e9e6b72ce96",
};

function App() {
  const [isDark, setIsDark] = useState(true);
  const currentTheme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark(!isDark);

  return (
    <PhantomProvider
      config={config}
      theme={currentTheme}
      appIcon="https://picsum.photos/seed/picsum/200"
      appName="React SDK Demo"
    >
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          backgroundColor: currentTheme.background,
          transition: "background-color 0.3s ease",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2rem",
            maxWidth: "800px",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          {/* Theme Toggle */}
          <div
            style={{
              position: "fixed",
              top: "2rem",
              right: "2rem",
              zIndex: 1000,
            }}
          >
            <button
              onClick={toggleTheme}
              style={{
                padding: "12px 20px",
                background: currentTheme.background,
                color: currentTheme.text,
                border: `1px solid ${currentTheme.secondary}`,
                borderRadius: currentTheme.borderRadius,
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.3s ease",
              }}
            >
              {isDark ? "☀️" : "🌙"}
              <span>{isDark ? "Light" : "Dark"} Mode</span>
            </button>
          </div>

          <div
            style={{
              textAlign: "center",
              marginBottom: "2rem",
            }}
          >
            <h1
              style={{
                fontSize: "2.5rem",
                background: "linear-gradient(135deg, #ab9ff2 0%, #7c3aed 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: "0.5rem",
              }}
            >
              Phantom React SDK Demo
            </h1>
            <p
              style={{
                color: currentTheme.secondary,
                fontSize: "1.1rem",
                lineHeight: "1.6",
                transition: "color 0.3s ease",
              }}
            >
              Using ConnectButton component with built-in modal
            </p>
          </div>

          <ConnectExample />

          <div
            style={{
              marginTop: "3rem",
              padding: "1.5rem",
              background: currentTheme.background,
              borderRadius: currentTheme.borderRadius,
              border: `1px solid ${currentTheme.secondary}`,
              textAlign: "center",
              transition: "all 0.3s ease",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", color: currentTheme.text, transition: "color 0.3s ease" }}>
              📱 Mobile Testing
            </h3>
            <p
              style={{
                color: currentTheme.secondary,
                margin: "0",
                lineHeight: "1.5",
                transition: "color 0.3s ease",
              }}
            >
              On mobile devices, you'll see an additional "Open in Phantom App" button that will redirect to the Phantom
              mobile app via phantom.app/ul
            </p>
          </div>
        </div>
      </div>
    </PhantomProvider>
  );
}

export default App;
