import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically — no standalone needed
  // (keep commented for self-hosting reference: output: "standalone")
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow Prisma to work in serverless environments
  serverExternalPackages: ["@prisma/client", "@node-rs/argon2"],
  // Vercel-specific: functions configuration
  ...(process.env.VERCEL
    ? {
        // Override for Vercel deployment
      }
    : {}),
};

export default nextConfig;
