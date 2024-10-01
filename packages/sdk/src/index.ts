import { DEFAULT_EMBEDDED_ORIGIN } from "./constants";

export interface PhantomWalletOptions {
  embeddedOrigin?: string | RegExp;
}

const isValidOrigin = (origin: string, embeddedOrigin: string | RegExp) =>
  typeof embeddedOrigin === "string"
    ? origin === embeddedOrigin
    : embeddedOrigin.test(origin);

export function createPhantom(opts: PhantomWalletOptions = {}) {
  const embeddedOrigin = opts.embeddedOrigin ?? DEFAULT_EMBEDDED_ORIGIN;

  const iframe = document.createElement("iframe");

  iframe.src = "/src/wallet/index.html";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("marginwidth", "0");
  iframe.setAttribute("marginheight", "0");
  iframe.style.position = "fixed";
  iframe.style.bottom = "0";
  iframe.style.right = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";

  window.addEventListener("message", (event) => {
    if (!isValidOrigin(event.origin, embeddedOrigin)) {
      return;
    }

    iframe.style.width = `${event.data.width}px`;
    iframe.style.height = `${event.data.height}px`;
  });

  document.body.appendChild(iframe);

  return () => {
    document.body.removeChild(iframe);
  };
}
