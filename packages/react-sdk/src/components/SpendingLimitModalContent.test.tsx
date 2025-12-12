import { render } from "@testing-library/react";
import { SpendingLimitModalContent } from "./SpendingLimitModalContent";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

const mockTheme = {
  background: "#ffffff" as const,
  text: "#000000" as const,
  secondary: "#666666" as const,
  aux: "#cccccc" as const,
  overlay: "rgba(0, 0, 0, 0.7)" as const,
  borderRadius: "16px" as const,
  error: "#ff0000" as const,
  success: "#00ff00" as const,
  brand: "#0000ff" as const,
};

describe("SpendingLimitModalContent", () => {
  it("should render spending limit message and close button", () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ThemeProvider theme={mockTheme}>
        <SpendingLimitModalContent onClose={onClose} />
      </ThemeProvider>,
    );

    expect(
      getByText(/You've reached the maximum daily limit allowed to spend by this application/),
    ).toBeInTheDocument();
    expect(getByText("Close")).toBeInTheDocument();
  });
});
