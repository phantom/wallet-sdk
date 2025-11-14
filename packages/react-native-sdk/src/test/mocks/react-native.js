module.exports = {
  StyleSheet: {
    create: jest.fn(styles => styles),
    flatten: jest.fn(style => style),
  },
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
  SafeAreaView: "SafeAreaView",
  ActivityIndicator: "ActivityIndicator",
  Image: "Image",
  Modal: "Modal",
  Linking: {
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
  Platform: {
    OS: "ios",
    select: jest.fn(obj => obj.ios || obj.default),
  },
};
