import type { NextConfig } from "next";

// process.cwd() (not __dirname): next.config.ts is bundled before execution,
// so __dirname can resolve to the bundle's temp dir and point Turbopack at
// the wrong root, 404ing every route. The dev/build commands always run from
// the project directory, so cwd is the project root.
const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
