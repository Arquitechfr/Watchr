const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo-metro-config').MetroConfig} */
const defaultConfig = getDefaultConfig(__dirname);

module.exports = withNativeWind(defaultConfig, { input: "./global.css" });
