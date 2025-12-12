import type { PhantomTheme } from "@phantom/react-sdk";

// AuthProviderType includes all SDK providers plus deeplink for UI purposes
type AuthProviderType = "google" | "apple" | "phantom" | "injected" | "deeplink";

interface SidebarProps {
  enabledProviders: AuthProviderType[];
  onProvidersChange: (providers: AuthProviderType[]) => void;
  themeMode: "auto" | "dark" | "light" | "custom";
  onThemeModeChange: (mode: "auto" | "dark" | "light" | "custom") => void;
  customTheme: Partial<PhantomTheme>;
  onCustomThemeChange: (theme: Partial<PhantomTheme>) => void;
  currentTheme: PhantomTheme;
}

const providerOptions: Array<{ id: AuthProviderType; label: string }> = [
  { id: "phantom", label: "Phantom" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "injected", label: "External Wallets" },
  { id: "deeplink", label: "Deeplink" },
];

export default function Sidebar({
  enabledProviders,
  onProvidersChange,
  themeMode,
  onThemeModeChange,
  customTheme,
  onCustomThemeChange,
  currentTheme,
}: SidebarProps) {
  const toggleProvider = (providerId: AuthProviderType) => {
    if (enabledProviders.includes(providerId)) {
      onProvidersChange(enabledProviders.filter(p => p !== providerId));
    } else {
      onProvidersChange([...enabledProviders, providerId]);
    }
  };

  const updateCustomThemeColor = (key: keyof PhantomTheme, value: string) => {
    onCustomThemeChange({ ...customTheme, [key]: value });
  };

  return (
    <div
      className="sidebar-container"
      style={{
        width: "320px",
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        overflowY: "auto",
        borderRight: "1px solid rgba(152, 151, 156, 0.2)",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <img
            src="/icon.png"
            alt="Phantom"
            style={{
              width: "40px",
              height: "40px",
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#FFFFFF" }}>Phantom Connect</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#98979C" }}>Demo</p>
          </div>
        </div>
        <p style={{ margin: "12px 0 0 0", fontSize: "12px", color: "#98979C", lineHeight: "1.5" }}>
          React component library for new wallet creation and connecting existing wallets.
        </p>
      </div>

      {/* Methods Section */}
      <div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#FFFFFF" }}>Methods</h2>
        <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#98979C", lineHeight: "1.5" }}>
          Any user can create or login to an existing wallet via social login.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {providerOptions.map(option => {
            const isEnabled = enabledProviders.includes(option.id);

            return (
              <div
                key={option.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  backgroundColor: isEnabled ? "rgba(124, 99, 231, 0.1)" : "transparent",
                  borderRadius: "8px",
                  border: `1px solid ${isEnabled ? "rgba(124, 99, 231, 0.3)" : "rgba(152, 151, 156, 0.2)"}`,
                  opacity: 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "14px", color: "#FFFFFF" }}>{option.label}</span>
                </div>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "44px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleProvider(option.id)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: isEnabled ? "#7C63E7" : "#3a3a3a",
                      borderRadius: "12px",
                      transition: "background-color 0.3s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: isEnabled ? "22px" : "2px",
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "50%",
                        transition: "left 0.3s",
                      }}
                    />
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customization Section */}
      <div>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#FFFFFF" }}>Customization</h2>
        <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#98979C", lineHeight: "1.5" }}>
          Customize the appearance of the connect modal.
        </p>

        {/* Theme Selector */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#98979C" }}>Theme</label>
          <select
            value={themeMode}
            onChange={e => onThemeModeChange(e.target.value as "auto" | "dark" | "light" | "custom")}
            style={{
              width: "100%",
              padding: "10px 12px",
              backgroundColor: "#2a2a2a",
              border: "1px solid rgba(152, 151, 156, 0.2)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <option value="auto">Auto</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Custom Theme Color Pickers */}
        {themeMode === "custom" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", boxSizing: "border-box" }}
          >
            {(
              [
                { key: "background" as const, label: "Background" },
                { key: "text" as const, label: "Text" },
                { key: "secondary" as const, label: "Secondary" },
                { key: "brand" as const, label: "Brand Color" },
                { key: "error" as const, label: "Error" },
                { key: "success" as const, label: "Success" },
              ] as Array<{ key: keyof PhantomTheme; label: string }>
            ).map(({ key, label }) => {
              const value = customTheme[key] || currentTheme[key];
              const isHex = typeof value === "string" && value.startsWith("#");

              return (
                <div key={key}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#98979C" }}>
                    {label}
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="color"
                      value={isHex ? value : "#000000"}
                      onChange={e => updateCustomThemeColor(key, e.target.value)}
                      style={{
                        width: "40px",
                        height: "40px",
                        border: "1px solid rgba(152, 151, 156, 0.2)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                      }}
                    />
                    <input
                      type="text"
                      value={isHex ? value : ""}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.startsWith("#") || val === "") {
                          updateCustomThemeColor(key, val || "#000000");
                        }
                      }}
                      placeholder="#000000"
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        backgroundColor: "#2a2a2a",
                        border: "1px solid rgba(152, 151, 156, 0.2)",
                        borderRadius: "8px",
                        color: "#FFFFFF",
                        fontSize: "14px",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Border Radius */}
            <div style={{ width: "100%", boxSizing: "border-box" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#98979C" }}>
                Border Radius
              </label>
              <input
                type="text"
                value={customTheme.borderRadius || currentTheme.borderRadius}
                onChange={e => updateCustomThemeColor("borderRadius", e.target.value)}
                placeholder="16px"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "8px 10px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid rgba(152, 151, 156, 0.2)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  lineHeight: "1.4",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Overlay (rgba) */}
            <div style={{ width: "100%", boxSizing: "border-box" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#98979C" }}>
                Overlay
              </label>
              <input
                type="text"
                value={customTheme.overlay || currentTheme.overlay}
                onChange={e => updateCustomThemeColor("overlay", e.target.value)}
                placeholder="rgba(0, 0, 0, 0.7)"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "8px 10px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid rgba(152, 151, 156, 0.2)",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  lineHeight: "1.4",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
