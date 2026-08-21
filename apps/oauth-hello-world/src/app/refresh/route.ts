// Refresh inside a Route Handler. Unlike a Server Component, this context can
// persist a rotated refresh token back to the encrypted cookie atomically.

import { NextResponse, type NextRequest } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const accessToken = await getValidAccessToken();
  return NextResponse.redirect(new URL(accessToken ? '/dashboard' : '/sign-out', request.url));
}
