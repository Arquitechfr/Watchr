const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { createTransformer } = require("react-native-svg-transformer");

/** @type {import('expo-metro-config').MetroConfig} */
const defaultConfig = getDefaultConfig(__dirname);

const { transformer, resolver } = createTransformer(defaultConfig);

defaultConfig.transformer = {
  ...defaultConfig.transformer,
  ...transformer,
};
defaultConfig.resolver = {
  ...defaultConfig.resolver,
  ...resolver,
};

module.exports = withNativeWind(defaultConfig, { input: "./global.css" });
