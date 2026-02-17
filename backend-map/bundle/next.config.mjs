/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing image config
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  
  // CORRECT way to skip TypeScript errors
  typescript: {
    ignoreBuildErrors: true, 
  },

  // CORRECT way to skip ESLint (The key MUST be lowercase 'eslint')
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;