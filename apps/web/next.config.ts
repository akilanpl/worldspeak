import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static offline board lives in public/offline and is served as-is.
  // No remote images, fonts, or scripts anywhere in Phase 1.
  images: { unoptimized: true },
};

export default nextConfig;
