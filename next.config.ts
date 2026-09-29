import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(process.env.NEXT_PUBLIC_PREVIEW_MODE === "true"
    ? { output: "export" as const, assetPrefix: "." }
    : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
