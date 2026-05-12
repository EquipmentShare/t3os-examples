import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'T3OS OAuth Hello World',
  description:
    'Hello-world example of the T3OS user-delegated OAuth flow: authorization code + PKCE, ' +
    'confidential client, refresh-token rotation, iron-session.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
