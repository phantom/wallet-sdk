import { TouchableOpacity, View, type ViewStyle } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";
import { Text } from "./Text";
import type { ModalHeaderProps } from "./ModalHeader";

export function ModalHeader({ goBack = false, onGoBack, title, onClose }: ModalHeaderProps) {
  const theme = useTheme();

  const headerStyle: ViewStyle = {
    position: "relative",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 28,
    paddingHorizontal: 32,
    marginBottom: 24,
  };

  const titleStyle: ViewStyle = {
    // Title styling handled by Text component
  };

  const backButtonStyle: ViewStyle = {
    position: "absolute",
    left: 32,
    top: 22,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  };

  const closeButtonStyle: ViewStyle = {
    position: "absolute",
    right: 32,
    top: 22,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  };

  return (
    <View style={headerStyle}>
      {goBack && onGoBack && (
        <TouchableOpacity style={backButtonStyle} onPress={onGoBack}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <Icon type="chevron-right" size={16} color={theme.secondary} />
          </View>
        </TouchableOpacity>
      )}
      <View style={titleStyle}>
        <Text variant="caption" color={theme.secondary}>
          {title}
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity style={closeButtonStyle} onPress={onClose}>
          <Text variant="caption" color={theme.secondary} style={{ fontSize: 24 }}>
            ×
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
