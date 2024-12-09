import {
  jest,
  expect,
  describe,
  it,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { createPhantom, Position, CreatePhantomConfig } from "../index.js";
import { SDK_URL } from "../constants.js";

describe("Position enum", () => {
  it("should have the correct values", () => {
    expect(Position.bottomRight).toBe("bottom-right");
    expect(Position.bottomLeft).toBe("bottom-left");
    expect(Position.topRight).toBe("top-right");
    expect(Position.topLeft).toBe("top-left");
  });
});

describe("createPhantom", () => {
  let mockContainer: HTMLDivElement;
  let originalHead: HTMLElement | null;

  beforeEach(() => {
    originalHead = document.head;
    mockContainer = document.createElement("div");
    Object.defineProperty(document, "head", {
      value: mockContainer,
      writable: true,
    });

    jest.spyOn(document, "createElement");
    jest.spyOn(mockContainer, "insertBefore");
    jest.spyOn(mockContainer, "removeChild");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(document, "head", {
      value: originalHead,
      writable: true,
    });
  });

  it("should create script tag with default config", () => {
    createPhantom();
    expect(document.createElement).toHaveBeenCalledWith("script");
    expect(mockContainer.insertBefore).toHaveBeenCalled();
  });

  it("should add correct URL parameters based on config", () => {
    const config: CreatePhantomConfig = {
      zIndex: 999,
      hideLauncherBeforeOnboarded: true,
      colorScheme: "dark",
      paddingBottom: 20,
      paddingRight: 20,
      paddingTop: 20,
      paddingLeft: 20,
      position: Position.bottomRight,
    };

    createPhantom(config);

    const scriptElement = (
      document.createElement as jest.MockedFunction<
        typeof document.createElement
      >
    ).mock.results[0].value as HTMLScriptElement;
    const srcUrl = new URL(scriptElement.src);

    expect(srcUrl.searchParams.get("zIndex")).toBe("999");
    expect(srcUrl.searchParams.get("hideLauncherBeforeOnboarded")).toBe("true");
    expect(srcUrl.searchParams.get("colorScheme")).toBe("dark");
    expect(srcUrl.searchParams.get("paddingBottom")).toBe("20");
    expect(srcUrl.searchParams.get("paddingRight")).toBe("20");
    expect(srcUrl.searchParams.get("paddingTop")).toBe("20");
    expect(srcUrl.searchParams.get("paddingLeft")).toBe("20");
    expect(srcUrl.searchParams.get("position")).toBe("bottom-right");
  });

  it("should handle partial config", () => {
    const config: CreatePhantomConfig = {
      zIndex: 999,
      position: Position.topRight,
    };

    createPhantom(config);

    const scriptElement = (
      document.createElement as jest.MockedFunction<
        typeof document.createElement
      >
    ).mock.results[0].value as HTMLScriptElement;
    const srcUrl = new URL(scriptElement.src);

    expect(srcUrl.searchParams.get("zIndex")).toBe("999");
    expect(srcUrl.searchParams.get("position")).toBe("top-right");
    expect(srcUrl.searchParams.get("colorScheme")).toBeNull();
    expect(srcUrl.searchParams.get("paddingBottom")).toBeNull();
  });

  it("should set correct script attributes", () => {
    createPhantom();
    const scriptElement = (
      document.createElement as jest.MockedFunction<
        typeof document.createElement
      >
    ).mock.results[0].value as HTMLScriptElement;
    expect(scriptElement.type).toBe("module");
    expect(scriptElement.src).toContain(SDK_URL);
  });

  it("should handle invalid config values gracefully", () => {
    const config = {
      zIndex: -1,
      position: "invalid-position" as Position,
    };

    createPhantom(config as CreatePhantomConfig);
    const scriptElement = (
      document.createElement as jest.MockedFunction<
        typeof document.createElement
      >
    ).mock.results[0].value as HTMLScriptElement;
    const srcUrl = new URL(scriptElement.src);

    expect(srcUrl.searchParams.get("zIndex")).toBe("-1");
    expect(srcUrl.searchParams.get("position")).toBe("invalid-position");
  });
});
