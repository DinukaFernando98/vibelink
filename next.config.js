/** @type {import('next').NextConfig} */

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SOCKET_URL) {
  console.warn(
    '\n[VibeLink] WARNING: NEXT_PUBLIC_SOCKET_URL is not set.\n' +
    'Set it in cPanel → Node.js Manager → Environment Variables.\n'
  );
}

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
