import type { NextConfig } from "next";

const appwriteOriginEndpoint =
  process.env.APPWRITE_ORIGIN_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://nyc.cloud.appwrite.io/v1";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${appwriteOriginEndpoint}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
      },
      {
        protocol: "https",
        hostname: "*.appwrite.io",
      },
      {
        protocol: "https",
        hostname: "appwrite.io",
      },
    ],
  },
};

export default nextConfig;
