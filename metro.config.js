// Metro must not crawl the native Android build output of THIS project (thousands of files):
// it makes "expo start --web" fail with "Failed to start watch mode".
// The patterns are anchored to the project root so JS packages that have their own
// "android" folder (e.g. node_modules/expo-symbols/build/android) keep resolving.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const underRoot = (dir) => new RegExp(`^${escape(path.join(__dirname, dir))}[\\\\/].*`);

const ignored = [underRoot('android'), underRoot('data_sync'), underRoot('chat_data')];
const existing = config.resolver.blockList;
config.resolver.blockList = [].concat(existing ? (Array.isArray(existing) ? existing : [existing]) : [], ignored);

module.exports = config;
