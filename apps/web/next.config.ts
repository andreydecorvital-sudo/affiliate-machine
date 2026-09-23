import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@affiliate/core"],
  poweredByHeader: false
};

export default nextConfig;
