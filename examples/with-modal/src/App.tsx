import { useState, useMemo, useEffect } from "react";
import {
  PhantomProvider,
  type PhantomSDKConfig,
  AddressType,
  darkTheme,
  lightTheme,
  mergeTheme,
  type PhantomTheme,
} from "@phantom/react-sdk";

type AuthProviderType = "google" | "apple" | "phantom" | "x" | "tiktok" | "injected";
import ConnectExample from "./ConnectExample";
import Sidebar from "./Sidebar";

const initialConfig: PhantomSDKConfig = {
  providers: ["google", "apple", "phantom", "injected"],
  addressTypes: [AddressType.solana, AddressType.ethereum] as const,
  appId: "7b91c1dd-c3c2-4088-8db3-3e9e6b72ce96",
};

function App() {
  const [enabledProviders, setEnabledProviders] = useState<AuthProviderType[]>([
    "google",
    "apple",
    "phantom",
    "injected",
  ]);
  const [themeMode, setThemeMode] = useState<"auto" | "dark" | "light" | "custom">("dark");
  const [customTheme, setCustomTheme] = useState<Partial<PhantomTheme>>({});
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true,
  );

  // Listen to system preference changes for auto mode
  useEffect(() => {
    if (themeMode !== "auto") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  // Determine which theme to use
  const resolvedTheme = useMemo(() => {
    if (themeMode === "custom") {
      return mergeTheme(customTheme);
    } else if (themeMode === "light") {
      return mergeTheme(lightTheme);
    } else if (themeMode === "dark") {
      return mergeTheme(darkTheme);
    } else {
      // Auto mode - use system preference
      return mergeTheme(systemPrefersDark ? darkTheme : lightTheme);
    }
  }, [themeMode, customTheme, systemPrefersDark]);

  // Create config with current providers
  const config: PhantomSDKConfig = useMemo(
    () => ({
      ...initialConfig,
      providers: enabledProviders.length > 0 ? enabledProviders : ["injected"],
    }),
    [enabledProviders],
  );

  return (
    <PhantomProvider
      config={config}
      theme={resolvedTheme}
      appIcon="https://picsum.photos/seed/picsum/200"
      appName="React SDK Demo"
    >
      <style>
        {`
          @media (max-width: 768px) {
            .app-container {
              flex-direction: column !important;
            }
            .sidebar-container {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              border-right: none !important;
              border-bottom: 1px solid rgba(152, 151, 156, 0.2) !important;
            }
            .content-container {
              justify-content: flex-start !important;
              padding: 1rem !important;
            }
          }
        `}
      </style>
      <div
        className="app-container"
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* Sidebar */}
        <Sidebar
          enabledProviders={enabledProviders}
          onProvidersChange={setEnabledProviders}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          customTheme={customTheme}
          onCustomThemeChange={setCustomTheme}
          currentTheme={resolvedTheme}
        />

        {/* Main Content Area */}
        <div
          className="content-container"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2rem",
            padding: "2rem",
            backgroundColor: "#0a0a0a",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(152, 151, 156, 0.1) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        >
          <ConnectExample />

          <div
            style={{
              marginTop: "3rem",
              padding: "1.5rem",
              background: resolvedTheme.background,
              borderRadius: resolvedTheme.borderRadius,
              border: `1px solid ${resolvedTheme.secondary}`,
              textAlign: "center",
              transition: "all 0.3s ease",
              maxWidth: "600px",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", color: resolvedTheme.text, transition: "color 0.3s ease" }}>
              📱 Mobile Testing
            </h3>
            <p
              style={{
                color: resolvedTheme.secondary,
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
