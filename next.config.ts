import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) needs to run as a real Node module, not be
  // bundled - otherwise its worker script can't be resolved at runtime.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
