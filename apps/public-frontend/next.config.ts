import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const domain = process.env.DOMAIN ?? "cppms.localhost"
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@workspace/ui", "@workspace/pocketbase"],
  allowedDevOrigins: [
    `public.${domain}`,
    `admin.${domain}`,
    "public.cppms.local",
    "admin.cppms.local",
    "public.cppms.localhost",
    "admin.cppms.localhost",
  ],
}

export default nextConfig
