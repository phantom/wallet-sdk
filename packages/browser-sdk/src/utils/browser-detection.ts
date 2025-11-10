/**
 * Browser detection utility to identify browser name and version
 */

export interface BrowserInfo {
  name: string;
  version: string;
  userAgent: string;
}

/**
 * Parse browser information from a user agent string
 * This is the core parsing logic that can be unit tested independently
 */
export function parseBrowserFromUserAgent(userAgent: string, hasBraveAPI?: boolean): BrowserInfo {
  // Default fallback
  let name = "unknown";
  let version = "unknown";

  if (!userAgent || typeof userAgent !== "string") {
    return { name, version, userAgent: "unknown" };
  }

  try {
    // Edge (Chromium-based) - must be before Chrome since it contains Chrome in UA
    if (userAgent.includes("Edg/")) {
      name = "edge";
      const match = userAgent.match(/Edg\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }
    // Opera - must be before Chrome since it contains Chrome in UA
    else if (userAgent.includes("OPR/") || userAgent.includes("Opera/")) {
      name = "opera";
      const match = userAgent.match(/(?:OPR|Opera)\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }
    // Samsung Internet - must be before Chrome since it contains Chrome in UA
    else if (userAgent.includes("SamsungBrowser/")) {
      name = "samsung";
      const match = userAgent.match(/SamsungBrowser\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }
    // DuckDuckGo Browser - must be before Chrome since it contains Chrome in UA
    else if (userAgent.includes("DuckDuckGo/")) {
      name = "duckduckgo";
      const match = userAgent.match(/DuckDuckGo\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }
    // Brave (harder to detect as it uses Chrome UA, check for specific features)
    else if (userAgent.includes("Chrome/") && hasBraveAPI) {
      name = "brave";
      const match = userAgent.match(/Chrome\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }
    // Mobile browsers - check before desktop Chrome/Safari
    else if (userAgent.includes("Mobile/") || userAgent.includes("Android")) {
      if (userAgent.includes("Chrome/")) {
        name = "chrome-mobile";
        const match = userAgent.match(/Chrome\/([0-9]+(?:\.[0-9]+)*)/);
        if (match) version = match[1].split(".")[0];
      } else if (userAgent.includes("Firefox/")) {
        name = "firefox-mobile";
        const match = userAgent.match(/Firefox\/([0-9]+(?:\.[0-9]+)*)/);
        if (match) version = match[1].split(".")[0];
      } else if (userAgent.includes("Safari/") && userAgent.includes("Mobile/")) {
        name = "safari-mobile";
        const match = userAgent.match(/Version\/([0-9]+(?:\.[0-9]+)*)/);
        if (match) version = match[1].split(".")[0];
      } else {
        name = "mobile";
      }
    }
    // Chrome (must be after other Chromium-based browsers)
    else if (userAgent.includes("Chrome/")) {
      name = "chrome";
      const match = userAgent.match(/Chrome\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }
    // Firefox
    else if (userAgent.includes("Firefox/")) {
      name = "firefox";
      const match = userAgent.match(/Firefox\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }
    // Safari (must be after Chrome/Edge)
    else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
      name = "safari";
      const match = userAgent.match(/Version\/([0-9]+(?:\.[0-9]+)*)/);
      if (match) version = match[1].split(".")[0]; // Major version only
    }

    // If still unknown, try to extract any version-like pattern
    if (name === "unknown") {
      // Look for common browser patterns
      const patterns = [
        { regex: /Chrome\/([0-9]+)/, name: "chrome" },
        { regex: /Firefox\/([0-9]+)/, name: "firefox" },
        { regex: /Safari\/([0-9]+)/, name: "safari" },
        { regex: /Edge\/([0-9]+)/, name: "edge" },
        { regex: /Opera\/([0-9]+)/, name: "opera" },
      ];

      for (const pattern of patterns) {
        const match = userAgent.match(pattern.regex);
        if (match) {
          name = pattern.name;
          version = match[1];
          break;
        }
      }
    }
  } catch (error) {
    // Fallback to unknown if any error occurs
    // Browser parsing failed, continuing with fallback
  }

  return { name, version, userAgent };
}

/**
 * Detect the current browser and version from the user agent string
 */
export function detectBrowser(): BrowserInfo {
  // Only run in browser environment
  if (typeof window === "undefined" || !window.navigator?.userAgent) {
    return { name: "unknown", version: "unknown", userAgent: "unknown" };
  }

  const userAgent = window.navigator.userAgent;
  const hasBraveAPI = !!(navigator as any).brave;

  return parseBrowserFromUserAgent(userAgent, hasBraveAPI);
}

/**
 * Get a formatted platform name for use in authenticator names
 * Format: "browsername-v123" (e.g., "chrome-v120", "firefox-v119")
 */
export function getPlatformName(): string {
  const { name, version } = detectBrowser();
  return version !== "unknown" ? `${name}-v${version}` : name;
}

/**
 * Get detailed browser information as a string
 * Format: "Chrome 120.0" or "Firefox 119.0"
 */
export function getBrowserDisplayName(): string {
  const { name, version } = detectBrowser();
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  return version !== "unknown" ? `${capitalizedName} ${version}` : capitalizedName;
}

/**
 * Detect if the current device is a mobile device
 * Checks user agent for mobile indicators and screen size
 */
export function isMobileDevice(): boolean {
  // Only run in browser environment
  if (typeof window === "undefined" || !window.navigator?.userAgent) {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  // Check for mobile user agent patterns
  const mobilePatterns = [
    /android/,
    /iphone|ipad|ipod/,
    /blackberry/,
    /windows phone/,
    /mobile/,
    /tablet/,
    /silk/,
    /kindle/,
    /opera mini/,
    /opera mobi/,
  ];

  const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));

  // Also check screen size as additional indicator
  let isSmallScreen = false;
  try {
    // Check if screen is smaller than typical tablet size
    isSmallScreen = window.screen.width <= 768 || window.screen.height <= 768;
  } catch (error) {
    // If screen API is not available, rely on user agent only
    isSmallScreen = false;
  }

  // Also check for touch capability as additional indicator
  let isTouchDevice = false;
  try {
    isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  } catch (error) {
    // If touch API is not available, rely on other indicators
    isTouchDevice = false;
  }

  // Consider it mobile if UA indicates mobile OR (small screen AND touch capability)
  return isMobileUA || (isSmallScreen && isTouchDevice);
}
