import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AIA-PAMA Election Portal',
  description: 'Official online election system for AIA-PAMA',
  icons: {
    icon: [{ url: '/aia-pama-login-icon.png', type: 'image/png' }],
    apple: [{ url: '/aia-pama-login-icon.png', type: 'image/png' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Election data comes from Supabase/Worker — skip static prerender at build time */
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
