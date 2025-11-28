import React from "react";
import { Text, View } from "react-native";
import { render } from "@testing-library/react-native";
import { SpendingLimitModalContent } from "./SpendingLimitModalContent";

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

jest.mock("@phantom/wallet-sdk-ui", () => ({
  // Map UI primitives to React Native equivalents for this test
  Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  Button: ({ children, onClick }: any) => <View onTouchEnd={onClick}>{children}</View>,
  useTheme: () => mockTheme,
}));

describe("SpendingLimitModalContent (RN)", () => {
  it("should render spending limit message and buttons", () => {
    const onClose = jest.fn();
    const { getByText } = render(<SpendingLimitModalContent onClose={onClose} />);

    expect(getByText("Would you like to increase your limit?")).toBeTruthy();
    expect(getByText("You’ve reached your spending limit with this app")).toBeTruthy();
    expect(getByText("Close")).toBeTruthy();
    expect(getByText("Continue")).toBeTruthy();
  });
});
