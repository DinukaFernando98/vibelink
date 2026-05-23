import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, DM_Sans } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import Script from 'next/script';
import { CustomCursor } from '@/components/ui/CustomCursor';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VibeLink — Meet Strangers. Connect Instantly.',
  description: 'Anonymous video and text chat with strangers worldwide. No sign-up required. Connect in seconds.',
  keywords: ['anonymous chat', 'random video chat', 'meet strangers', 'video call', 'stranger chat', 'omegle alternative'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      </head>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} bg-white dark:bg-slate-950`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <CustomCursor />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
