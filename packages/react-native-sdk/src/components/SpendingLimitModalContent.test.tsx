import React from "react";
import { render } from "@testing-library/react-native";
import { SpendingLimitModalContent } from "./SpendingLimitModalContent";
import { ThemeProvider } from "@phantom/wallet-sdk-ui";

const mockTheme = {
  background: "#ffffff",
  text: "#000000",
  secondary: "#666666",
  aux: "#cccccc",
  overlay: "rgba(0, 0, 0, 0.7)",
  borderRadius: "16px",
  error: "#ff0000",
  success: "#00ff00",
  brand: "#0000ff",
};

describe("SpendingLimitModalContent (RN)", () => {
  it("should render spending limit message and button", () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ThemeProvider theme={mockTheme as any}>
        <SpendingLimitModalContent onClose={onClose} />
      </ThemeProvider>,
    );

    expect(getByText("Would you like to increase your limit?")).toBeTruthy();
    expect(getByText("Manage spending limit")).toBeTruthy();
  });
});


