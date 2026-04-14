import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VibeLink — Talk to Strangers Anonymously',
  description:
    'Connect with random strangers through text or video chat. No sign-up required. Stay anonymous.',
  keywords: ['anonymous chat', 'random chat', 'video chat', 'omegle alternative', 'stranger chat'],
  authors: [{ name: 'VibeLink' }],
  openGraph: {
    title: 'VibeLink — Talk to Strangers Anonymously',
    description: 'Connect with random strangers instantly. Text or video. Fully anonymous.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} bg-black`}>{children}</body>
    </html>
  );
}
