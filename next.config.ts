import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_APP_API_URL: "https://kioskapi.regeditpos.com",
  },
  reactStrictMode: true,
};

export default nextConfig;
