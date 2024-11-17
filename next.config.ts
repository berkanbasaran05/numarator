import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_APP_API_URL: "http://localhost:8080",
  },
  reactStrictMode: true,
};

export default nextConfig;
