const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];

// Force Metro to use local node_modules FIRST
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Block problematic monorepo react-native
config.resolver.blockList = [
  /.*\/wallet-sdk\/node_modules\/react-native\/.*/,
];

module.exports = config;