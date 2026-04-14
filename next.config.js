/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

if (isProd && !socketUrl) {
  throw new Error(
    '[VibeLink] NEXT_PUBLIC_SOCKET_URL is not set.\n' +
    'Add it in your Vercel project → Settings → Environment Variables.'
  );
}

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
