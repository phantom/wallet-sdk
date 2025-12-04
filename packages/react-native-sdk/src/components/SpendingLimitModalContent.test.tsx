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

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("@phantom/wallet-sdk-ui", () => ({
  // Map UI primitives to React Native equivalents for this test
  Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  Button: ({ children, onClick }: any) => <View onTouchEnd={onClick}>{children}</View>,
  useTheme: () => mockTheme,
}));

jest.mock("../PhantomContext", () => ({
  usePhantom: () => ({
    user: {
      authProvider: "google" as const,
    },
  }),
}));

jest.mock("../hooks/useConnect", () => ({
  useConnect: () => ({
    connect: mockConnect,
  }),
}));

jest.mock("../hooks/useDisconnect", () => ({
  useDisconnect: () => ({
    disconnect: mockDisconnect,
  }),
}));

describe("SpendingLimitModalContent (RN)", () => {
  it("should render spending limit message and buttons", () => {
    const onClose = jest.fn();
    const { getByText } = render(<SpendingLimitModalContent onClose={onClose} />);

    expect(getByText("Spending Limit Reached")).toBeTruthy();
    expect(getByText(/You've reached your spending limit with this app/)).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
    expect(getByText("Change Limit")).toBeTruthy();
  });
});
