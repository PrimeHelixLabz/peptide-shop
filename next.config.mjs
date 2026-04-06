/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // Force a single host to reduce duplicate URL indexing.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.primehelixlabz.com" }],
        destination: "https://primehelixlabz.com/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
