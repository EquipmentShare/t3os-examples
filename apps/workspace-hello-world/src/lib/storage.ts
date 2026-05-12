// Per-workspace persistence layer.
//
// Vercel KV (Upstash Redis under the hood) keyed by workspace id. The
// API key is encrypted before being written; only the encrypted blob is
// stored.

import { kv } from '@vercel/kv';
import { decrypt, encrypt } from './crypto';

interface StoredInstallRaw {
  encryptedApiKey: string;
  appId: string;
  principalId: string;
  scopes: string[];
  installedAt: string;
}

export interface StoredInstall {
  apiKey: string;
  appId: string;
  principalId: string;
  scopes: string[];
  installedAt: string;
}

function key(workspaceId: string) {
  return `t3os:workspace:${workspaceId}`;
}

export async function saveInstall(input: {
  workspaceId: string;
  apiKey: string;
  appId: string;
  principalId: string;
  scopes: string[];
}): Promise<void> {
  const record: StoredInstallRaw = {
    encryptedApiKey: encrypt(input.apiKey),
    appId: input.appId,
    principalId: input.principalId,
    scopes: input.scopes,
    installedAt: new Date().toISOString(),
  };
  await kv.set(key(input.workspaceId), record);
}

export async function loadInstall(workspaceId: string): Promise<StoredInstall | null> {
  const raw = await kv.get<StoredInstallRaw>(key(workspaceId));
  if (!raw) return null;
  return {
    apiKey: decrypt(raw.encryptedApiKey),
    appId: raw.appId,
    principalId: raw.principalId,
    scopes: raw.scopes,
    installedAt: raw.installedAt,
  };
}

export async function deleteInstall(workspaceId: string): Promise<void> {
  await kv.del(key(workspaceId));
}
