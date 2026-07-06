// Connectivity probe for diagnosing install-callback failures in deployed
// environments. Exercises the two network legs `/install-complete` depends
// on — the T3OS JWKS fetch and the Vercel KV REST API — and reports each
// independently, so a generic `fetch failed` can be attributed to one side.
//
// Safe to expose: the response carries only status booleans and error
// names/messages/codes. No env values, no key material, nothing read back
// out of KV beyond a throwaway probe value.

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

interface ProbeError {
  name?: string;
  message: string;
  cause?: ProbeError | string;
}

function describeError(e: unknown): ProbeError {
  if (!(e instanceof Error)) return { message: String(e) };
  const cause = (e as Error & { cause?: unknown }).cause;
  return {
    name: e.name,
    message: e.message,
    ...(cause !== undefined
      ? { cause: cause instanceof Error ? describeError(cause) : String(cause) }
      : {}),
  };
}

export async function GET() {
  const results: Record<string, unknown> = {};

  // Leg 1: the JWKS fetch that verifyInstallToken performs. env.jwksUrl()
  // throws on a missing env var — the catch reports that too.
  try {
    const res = await fetch(env.jwksUrl(), { cache: 'no-store' });
    results.jwks = { ok: res.ok, status: res.status };
  } catch (e) {
    results.jwks = { ok: false, error: describeError(e) };
  }

  // Leg 2: the KV REST round trip that saveInstall/loadInstall perform.
  try {
    const probeKey = 't3os:debug:probe';
    await kv.set(probeKey, 'ok', { ex: 60 });
    const value = await kv.get(probeKey);
    results.kv = { ok: value === 'ok' };
  } catch (e) {
    results.kv = { ok: false, error: describeError(e) };
  }

  return NextResponse.json(results);
}
