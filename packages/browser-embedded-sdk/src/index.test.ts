import { createPhantom, CreatePhantomConfig } from "./index";
import { PHANTOM_INITIALIZED_EVENT_NAME } from "./constants";

const MOCK_UUID = "12345678-1234-1234-1234-123456789012";
const MOCK_EVENT_NAME = `${PHANTOM_INITIALIZED_EVENT_NAME}#${MOCK_UUID}`;

jest.mock("./helpers", () => {
  return {
    getRandomUUID: () => MOCK_UUID,
  };
});

describe("createPhantom function", () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a Phantom object", async () => {
    setTimeout(() => window.dispatchEvent(new Event(MOCK_EVENT_NAME)), 500);
    const phantom = await createPhantom();
    expect(phantom).toHaveProperty("show");
    expect(phantom).toHaveProperty("hide");
  });

  it("appends searchParams based on config", async () => {
    const config: CreatePhantomConfig = {
      zIndex: 10,
      hideLauncherBeforeOnboarded: true,
      colorScheme: "dark",
    };

    const container = document.head ?? document.documentElement;
    const insertBeforeSpy = jest.spyOn(container, "insertBefore");

    setTimeout(() => window.dispatchEvent(new Event(MOCK_EVENT_NAME)), 500);
    await createPhantom(config);
    const scriptTagSrc = new URL((insertBeforeSpy.mock.calls[0][0] as HTMLScriptElement).src).toString();
    expect(scriptTagSrc).toContain("zIndex=10");
    expect(scriptTagSrc).toContain("hideLauncherBeforeOnboarded=true");
    expect(scriptTagSrc).toContain("colorScheme=dark");
  });

  it("inserts and removes a script tag in the head", async () => {
    const container = document.head ?? document.documentElement;
    const insertBeforeSpy = jest.spyOn(container, "insertBefore");
    const removeChildSpy = jest.spyOn(container, "removeChild");

    setTimeout(() => window.dispatchEvent(new Event(MOCK_EVENT_NAME)), 500);
    await createPhantom();

    expect(insertBeforeSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
