import { useState, useMemo, useEffect } from "react";
import {
  PhantomProvider,
  type PhantomSDKConfig,
  AddressType,
  darkTheme,
  lightTheme,
  mergeTheme,
  type PhantomTheme,
  useModal,
  usePhantom,
  useTheme,
  isMobileDevice,
} from "@phantom/react-sdk";

type AuthProviderType = "google" | "apple" | "phantom" | "injected" | "deeplink";
import ConnectExample from "./ConnectExample";
import Sidebar from "./Sidebar";

const initialConfig: PhantomSDKConfig = {
  providers: ["google", "apple", "phantom", "injected"],
  addressTypes: [AddressType.solana, AddressType.ethereum] as const,
  appId: "aaacb3a9-e45c-45b2-b53a-09d4e956f1ec",
};

const APP_ICON = "https://picsum.photos/seed/picsum/200";
const APP_NAME = "React SDK Demo";

function MobileFixedButton() {
  const { open } = useModal();
  const { isConnected } = usePhantom();
  const theme = useTheme();
  const isMobile = isMobileDevice();

  if (!isMobile) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        zIndex: 1000,
        boxSizing: "border-box",
      }}
    >
      <button
        onClick={open}
        style={{
          width: "100%",
          padding: "16px 24px",
          background: theme.brand || "#7C63E7",
          color: "#FFFFFF",
          border: "none",
          borderRadius: theme.borderRadius,
          fontSize: "16px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 12px rgba(124, 99, 231, 0.3)",
        }}
        onTouchStart={e => {
          e.currentTarget.style.opacity = "0.9";
        }}
        onTouchEnd={e => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        Open Phantom
      </button>
      {isConnected && (
        <div
          style={{
            marginTop: "8px",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#16a34a",
            fontWeight: "500",
          }}
        >
          Connected
        </div>
      )}
    </div>
  );
}

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

  // Create config with current providers (filter out deeplink as it's UI-only)
  const config: PhantomSDKConfig = useMemo(
    () => ({
      ...initialConfig,
      providers:
        enabledProviders.filter(p => p !== "deeplink").length > 0
          ? enabledProviders.filter(p => p !== "deeplink")
          : ["injected"],
    }),
    [enabledProviders],
  );

  return (
    <PhantomProvider config={config} theme={resolvedTheme} appIcon={APP_ICON} appName={APP_NAME}>
      <style>
        {`
          @media (max-width: 768px) {
            .app-container {
              flex-direction: column !important;
              padding-bottom: 90px !important;
            }
            .sidebar-container {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              border-right: none !important;
              border-bottom: 1px solid rgba(152, 151, 156, 0.2) !important;
              padding: 1rem !important;
              max-height: none !important;
              overflow-y: visible !important;
            }
            .content-container {
              justify-content: flex-start !important;
              align-items: center !important;
              padding: 0 !important;
              min-height: auto !important;
            }
          }
          @media (max-width: 480px) {
            .content-container {
              padding: 0.5rem !important;
            }
            .sidebar-container {
              padding: 0.75rem !important;
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
            gap: "2rem",
            padding: "2rem",
            backgroundColor: "#0a0a0a",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(152, 151, 156, 0.1) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        >
          <ConnectExample appIcon={APP_ICON} appName={APP_NAME} />
        </div>
        <MobileFixedButton />
      </div>
    </PhantomProvider>
  );
}

export default App;
