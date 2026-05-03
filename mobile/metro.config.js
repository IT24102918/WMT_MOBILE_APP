const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prefer compiled JavaScript package entries so Expo Go does not resolve
// TypeScript source entrypoints from native dependencies.
config.resolver.resolverMainFields = ['main', 'module', 'browser'];

module.exports = config;
