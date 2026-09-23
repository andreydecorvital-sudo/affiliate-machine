import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@affiliate/core",
    "@affiliate/providers",
    "@affiliate/intelligence",
    "@affiliate/attribution",
    "@affiliate/distribution"
  ],
  poweredByHeader: false
};

export default nextConfig;
