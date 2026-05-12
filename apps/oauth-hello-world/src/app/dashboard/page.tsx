import { decodeJwt } from 'jose';
import { redirect } from 'next/navigation';
import { getValidAccessToken } from '@/lib/auth';
import { env } from '@/lib/env';
import { gql } from '@/lib/graphql';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

interface WorkspaceData {
  getWorkspaceById: { id: string; name: string };
}

export default async function Dashboard() {
  const session = await getSession();
  if (!session.accessToken || !session.idToken || !session.workspaceId) {
    redirect('/');
  }

  // Refresh the token if it's about to expire. Returns null if the grant
  // was revoked (the smoke test's instant-cutoff property — see README).
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    redirect('/?error=session_expired_or_revoked');
  }

  const idClaims = decodeJwt(session.idToken) as Record<string, unknown>;
  const accessClaims = decodeJwt(accessToken) as Record<string, unknown>;

  let workspaceName: string | null = null;
  let queryError: string | null = null;
  try {
    const data = await gql<WorkspaceData>(
      accessToken,
      'query Q($id: String!) { getWorkspaceById(id: $id) { id name } }',
      { id: session.workspaceId },
    );
    workspaceName = data.getWorkspaceById.name;
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  return (
    <main>
      <h1>Signed in to T3OS</h1>
      <p className="subtitle">
        The OAuth round-trip succeeded. Below is everything the access token + id token tell us,
        plus one live GraphQL call proving the bearer token works.
      </p>

      <h2>From the id token</h2>
      <div className="card">
        <dl className="kv">
          <dt>name</dt>
          <dd>{String(idClaims.name ?? '(not set)')}</dd>
          <dt>email</dt>
          <dd>{String(idClaims.email ?? '(not set)')}</dd>
          <dt>sub</dt>
          <dd>{String(idClaims.sub)}</dd>
        </dl>
      </div>

      <h2>From the access token</h2>
      <div className="card">
        <dl className="kv">
          <dt>workspace_id</dt>
          <dd>{session.workspaceId}</dd>
          <dt>scope</dt>
          <dd>{String(accessClaims.scope ?? '')}</dd>
          <dt>aud</dt>
          <dd>{JSON.stringify(accessClaims.aud)}</dd>
          <dt>expires</dt>
          <dd>{new Date(session.expiresAt ?? 0).toISOString()}</dd>
        </dl>
      </div>

      <h2>One live GraphQL call: getWorkspaceById</h2>
      <div className="card">
        {queryError ? (
          <div className="error" style={{ margin: 0 }}>
            {queryError}
          </div>
        ) : (
          <dl className="kv">
            <dt>workspace name</dt>
            <dd>{workspaceName}</dd>
          </dl>
        )}
      </div>

      <div className="actions">
        <a className="button" href="/dashboard">
          Refresh data
        </a>
        <form action="/sign-out" method="post" style={{ display: 'inline' }}>
          <button type="submit" className="button button-secondary">
            Sign out
          </button>
        </form>
        <a className="button button-secondary" href={env.revokeUrl()}>
          Manage / revoke access in T3OS →
        </a>
      </div>

      <div className="footer">
        <strong>Sign out vs revoke:</strong> &quot;Sign out&quot; clears the session cookie but
        leaves your grant intact, so signing in again skips the consent screen. The &quot;Manage /
        revoke&quot; link goes to T3OS&apos;s connected-apps settings where you can delete the grant
        entirely — once revoked, the same token stops working immediately, even before expiry. See{' '}
        <a href="https://github.com/EquipmentShare/t3os-examples">the README</a> for the wire-level
        details.
      </div>
    </main>
  );
}
