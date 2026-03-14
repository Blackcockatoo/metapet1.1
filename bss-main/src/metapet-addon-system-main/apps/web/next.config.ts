import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@bluesnake-studios/addon-core",
    "@bluesnake-studios/addon-crypto",
    "@bluesnake-studios/addon-minting",
    "@bluesnake-studios/addon-store",
    "@bluesnake-studios/config",
    "@bluesnake-studios/moss60",
    "@bluesnake-studios/ui"
  ]
};

export default nextConfig;
