import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@affiliate/core", "@affiliate/providers"],
  poweredByHeader: false
};

export default nextConfig;
