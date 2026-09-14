import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sealData } from 'iron-session';
import { getCookieSession, type CookieOptions, type CookieStore } from './cookie-session';

const options = {
  password: 'test-session-password-at-least-32-characters',
  cookieName: 't3os-oauth-hello-world',
  secure: true,
};

function cookieStore() {
  const values = new Map<string, string>();
  const writes: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const store: CookieStore = {
    get(name) {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set(name, value, cookieOptions) {
      // Include space for the cookie name and all serialized attributes.
      assert.ok(Buffer.byteLength(`${name}=${value}`) + 150 < 4096);
      writes.push({ name, value, options: cookieOptions });
      if (cookieOptions.maxAge === 0) values.delete(name);
      else values.set(name, value);
    },
  };
  return { store, values, writes };
}

test('OAuth tokens plus user and five workspace preferences survive a browser round-trip', async () => {
  const { store, values, writes } = cookieStore();
  const payload = {
    accessToken: 'jwt'.repeat(700),
    refreshToken: 'refresh'.repeat(30),
    user: { uid: 'user-id', sub: 'oidc|test@example.com', picture: 'https://example.com/avatar' },
    knownWorkspaces: Array.from({ length: 5 }, (_, index) => ({
      workspaceId: `workspace-${index}`,
      name: 'A long workspace name '.repeat(6),
    })),
  };
  const session = await getCookieSession<typeof payload>(store, options);
  Object.assign(session, payload);
  await session.save();
  assert.ok(values.size > 1);
  assert.deepEqual({ ...(await getCookieSession<typeof payload>(store, options)) }, payload);
  for (const write of writes) {
    assert.equal(write.options.httpOnly, true);
    assert.equal(write.options.secure, true);
    assert.equal(write.options.sameSite, 'lax');
    assert.equal(write.options.path, '/');
  }
});

test('existing iron-session cookies migrate, and sign-out clears surplus chunks', async () => {
  const { store, values } = cookieStore();
  values.set(options.cookieName, await sealData({ preferredWorkspaceId: 'workspace-1' }, options));
  const session = await getCookieSession<{ preferredWorkspaceId?: string; accessToken?: string }>(
    store,
    options,
  );
  assert.equal(session.preferredWorkspaceId, 'workspace-1');
  session.accessToken = 'x'.repeat(4000);
  await session.save();
  assert.ok(values.size > 1);
  delete session.accessToken;
  await session.save();
  assert.equal(values.size, 1);
  assert.deepEqual(
    { ...(await getCookieSession(store, options)) },
    { preferredWorkspaceId: 'workspace-1' },
  );
  session.destroy();
  assert.equal(values.size, 0);
});

test('missing or tampered chunks cannot authenticate, and oversized writes are atomic', async () => {
  const { store, values } = cookieStore();
  const session = await getCookieSession<{ accessToken?: string }>(store, options);
  session.accessToken = 'x'.repeat(4000);
  await session.save();
  const saved = new Map(values);
  values.delete(`${options.cookieName}.1`);
  assert.deepEqual({ ...(await getCookieSession(store, options)) }, {});
  values.set(`${options.cookieName}.1`, 'tampered');
  assert.deepEqual({ ...(await getCookieSession(store, options)) }, {});
  values.clear();
  for (const [name, value] of saved) values.set(name, value);
  session.accessToken = 'x'.repeat(20000);
  await assert.rejects(session.save(), /session.*too large/i);
  assert.deepEqual(values, saved);
});
