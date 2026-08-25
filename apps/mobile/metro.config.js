// Metro (React Native's bundler) needs extra config in a pnpm monorepo: pnpm's
// node_modules are symlink-based, and Metro doesn't watch/resolve outside the app's own
// folder by default. See https://docs.expo.dev/guides/monorepos/.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules"), path.resolve(workspaceRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

// @omboo/shared ships TypeScript source with NodeNext-style ".js" import specifiers
// (e.g. "./date-utils.js" resolving to date-utils.ts) — tell Metro's resolver about it too.
config.resolver.sourceExts = [...config.resolver.sourceExts, "ts", "tsx"];

module.exports = config;
