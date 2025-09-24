import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export class SimpleWebView extends React.Component<{ testID?: string }> {
  render() {
    return React.createElement(View as any, {
      style: styles.container,
      testID: this.props.testID || 'simple-webview'
    }, React.createElement(Text as any, {
      style: styles.text
    }, 'SimpleWebView Test Component'));
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    color: 'white',
    fontSize: 18,
    backgroundColor: 'blue',
    padding: 20,
    borderRadius: 8
  }
});