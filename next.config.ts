import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_APP_API_URL: "https://kioskapi.regeditpos.com",
    NEXT_PUBLIC_SOCKET_URL: "https://kioskapi.regeditpos.com/customerscreen",
    NEXT_PUBLIC_CUSTOMERSCREEN_SOCKET_KEY: "regedit***pos***screen",
  },
  reactStrictMode: true,
};

export default nextConfig;
