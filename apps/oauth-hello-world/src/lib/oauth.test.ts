import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAuthorizeUrl } from './oauth';

process.env.AUTH0_DOMAIN = 'example.auth0.com';
process.env.AUTH0_CLIENT_ID = 'example-client';
process.env.AUTH0_AUDIENCE = 'https://api.example.com/delegated';
process.env.OAUTH_REDIRECT_URI = 'https://example.com/callback';

const request = {
  state: 'state',
  nonce: 'nonce',
  codeChallenge: 'challenge',
  scopes: ['all_resources_reader'],
};

test('choosing another workspace forces the interactive consent flow', () => {
  const url = new URL(buildAuthorizeUrl({ ...request, chooseWorkspace: true }));
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.has('ext-workspace-id'), false);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
});

test('normal sign-in and explicit workspace targets still allow grant reuse', () => {
  for (const workspaceId of [undefined, 'workspace-1']) {
    const url = new URL(buildAuthorizeUrl({ ...request, workspaceId }));
    assert.equal(url.searchParams.has('prompt'), false);
    assert.equal(url.searchParams.get('ext-workspace-id'), workspaceId ?? null);
  }
});
