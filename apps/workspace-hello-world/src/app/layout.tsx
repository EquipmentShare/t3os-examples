import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'T3OS Workspace Hello World',
  description:
    'Hello-world example of the T3OS workspace-installed auth flow: install-token JWT, ' +
    'JWKS verification, AES-256-GCM at-rest, X-API-Key calls to GraphQL.',
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
