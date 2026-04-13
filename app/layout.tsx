import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Ruby Ace — MLB Analytics Platform',
  description: 'Professional MLB analytics for fantasy baseball, DraftKings DFS, and Underdog Pick\'em. Real-time data, advanced optimizer, and ESPN league sync.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: '#0e0e0e', color: '#e2e8f0', minHeight: '100vh' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
