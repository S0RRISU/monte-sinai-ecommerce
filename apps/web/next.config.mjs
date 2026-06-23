/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [68, 70, 72, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nnglqufeyergsgzafdek.supabase.co'
      }
    ]
  }
};

export default nextConfig;
