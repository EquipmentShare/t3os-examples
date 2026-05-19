import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'T3OS OIDC Hello World',
  description:
    'Hello-world example of the T3OS sign-in-only OIDC flow: authorization code + PKCE, ' +
    'JWKS-verified id_token, no API access. Reference for "Sign in with T3OS" integrators.',
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
