import { getDeeplinkToPhantom } from "./deeplink";

describe("getDeeplinkToPhantom", () => {
  const originalHref = window.location.href;

  afterEach(() => {
    window.history.replaceState({}, "", originalHref);
  });

  it("builds a deeplink for the current URL without ref", () => {
    window.history.replaceState({}, "", "https://localhost:3000/path?query=1");
    const result = getDeeplinkToPhantom();

    expect(result).toBe("https://phantom.app/ul/browse/https%3A%2F%2Flocalhost%3A3000%2Fpath%3Fquery%3D1");
  });

  it("includes an encoded ref param when provided", () => {
    window.history.replaceState({}, "", "https://localhost:3000/path");
    const result = getDeeplinkToPhantom("my ref");

    expect(result).toBe("https://phantom.app/ul/browse/https%3A%2F%2Flocalhost%3A3000%2Fpath?ref=my%20ref");
  });

  it("throws for non-http(s) URLs", () => {
    expect(() => getDeeplinkToPhantom(undefined, "chrome-extension://abcdef/index.html")).toThrow(
      "Invalid URL protocol - only HTTP/HTTPS URLs are supported for deeplinks",
    );
  });
});
