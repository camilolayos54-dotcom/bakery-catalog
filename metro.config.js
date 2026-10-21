// Metro must not crawl the native Android build output (thousands of files): it makes
// "expo start --web" fail with "Failed to start watch mode".
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const ignored = [/[\\/]android[\\/].*/, /[\\/]\.gradle[\\/].*/, /[\\/]data_sync[\\/].*/, /[\\/]chat_data[\\/].*/];
const existing = config.resolver.blockList;
config.resolver.blockList = [].concat(existing ? (Array.isArray(existing) ? existing : [existing]) : [], ignored);

module.exports = config;
