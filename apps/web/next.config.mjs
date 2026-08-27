/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle (server.js + only the node_modules it actually needs) — keeps
  // the production Docker image lean instead of shipping the whole workspace node_modules tree.
  output: "standalone",
  transpilePackages: ["@omboo/shared"],
  webpack: (config) => {
    // @omboo/shared uses NodeNext-style ESM imports ("./date-utils.js" resolving to
    // date-utils.ts) — webpack needs to be told to resolve those .js specifiers against
    // .ts/.tsx source files too.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
