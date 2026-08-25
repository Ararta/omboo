/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
