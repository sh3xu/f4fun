const nextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  transpilePackages: [
    "@f4fun/monopoly-engine",
    "@f4fun/seven-wonders-engine",
    "@f4fun/shared-types",
  ],
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
