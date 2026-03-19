/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
      {
        source: '/jobs/:path*',
        destination: 'http://127.0.0.1:3001/jobs/:path*',
      },
      {
        source: '/files/:path*',
        destination: 'http://127.0.0.1:3001/files/:path*',
      },
    ]
  },
}

export default nextConfig
