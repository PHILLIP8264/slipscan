const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add resolver for Node.js modules
config.resolver.alias = {
  buffer: require.resolve("buffer"),
};

// Ensure these modules are included in the bundle
config.resolver.platforms = ["ios", "android", "web"];

module.exports = config;
