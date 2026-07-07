import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@f4fun/monopoly-engine", "@f4fun/shared-types"],
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
    ],
  },
};

export default nextConfig;
