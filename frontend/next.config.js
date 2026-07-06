/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["https://pay-path-mu.vercel.app:3000"],
  cacheComponents: true,
  output: "standalone",
};

export default nextConfig;
