import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { gql } from '@/lib/graphql';
import { getSession } from '@/lib/session';
import { verifyDelegatedAccessToken } from '@/lib/verify';

export const dynamic = 'force-dynamic';

// Single GraphQL round-trip pulling both the workspace summary and the first
// few contacts. Both selections share the same auth check — bundling them
// keeps the dashboard responsive and exercises a richer slice of the API.
//
// `listContacts` returns the union `Contact = BusinessContact | PersonContact`;
// we inline-fragment both members so we always get a usable name to render.
const DASHBOARD_QUERY = `
  query Dashboard($workspaceId: String!, $page: ListContactsPage) {
    getWorkspaceById(id: $workspaceId) {
      id
      name
    }
    listContacts(filter: { workspaceId: $workspaceId }, page: $page) {
      items {
        __typename
        ... on BusinessContact { id name }
        ... on PersonContact { id name email }
      }
      page {
        totalItems
      }
    }
  }
`;

type ContactItem =
  | { __typename: 'BusinessContact'; id: string; name: string }
  | { __typename: 'PersonContact'; id: string; name: string; email: string };

interface DashboardData {
  getWorkspaceById: { id: string; name: string };
  listContacts: {
    items: ContactItem[];
    page: { totalItems: number };
  } | null;
}

export default async function Dashboard() {
  const session = await getSession();
  if (!session.accessToken || !session.user || !session.workspaceId) {
    // No session, OR a partial session (e.g. left over from an older
    // version of this code that stored different keys). Bounce to
    // /sign-out, which is a Route Handler — Server Components in Next.js
    // 15 can READ cookies but can't MODIFY them, so session.destroy()
    // here would throw. /sign-out clears the cookie and redirects to /.
    redirect('/sign-out');
  }

  // Cookie writes are forbidden in Server Components. Refresh in a Route
  // Handler so rotated refresh tokens are always persisted before rendering.
  if (!session.expiresAt || session.expiresAt - Date.now() <= 30_000) {
    redirect('/refresh');
  }

  const accessToken = session.accessToken;
  let accessClaims;
  try {
    accessClaims = await verifyDelegatedAccessToken(accessToken);
  } catch {
    redirect('/sign-out');
  }
  if (accessClaims['https://es-erp/workspace_id'] !== session.workspaceId) {
    redirect('/sign-out');
  }

  let workspaceName: string | null = null;
  let contacts: ContactItem[] = [];
  let totalContacts = 0;
  let queryError: string | null = null;
  try {
    const data = await gql<DashboardData>(accessToken, DASHBOARD_QUERY, {
      workspaceId: session.workspaceId,
      page: { number: 1, size: 5 },
    });
    workspaceName = data.getWorkspaceById.name;
    if (data.listContacts) {
      contacts = data.listContacts.items;
      totalContacts = data.listContacts.page.totalItems;
    }
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  return (
    <main>
      <h1>Signed in to T3OS</h1>
      <p className="subtitle">
        The OAuth round-trip succeeded. Below are the id-token claims captured at consent time, the
        live access-token claims, and one live GraphQL call proving the bearer token works.
      </p>

      <h2>From the id token (at consent time)</h2>
      <div className="card">
        <dl className="kv">
          <dt>name</dt>
          <dd>{session.user.name ?? '(not set)'}</dd>
          <dt>email</dt>
          <dd>{session.user.email ?? '(not set)'}</dd>
          <dt>sub</dt>
          <dd>{session.user.sub}</dd>
          <dt>stable T3OS uid</dt>
          <dd>{session.user.uid}</dd>
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

      <h2>One live GraphQL call: getWorkspaceById + listContacts</h2>
      <div className="card">
        {queryError ? (
          <div className="error" style={{ margin: 0 }}>
            {queryError}
          </div>
        ) : (
          <>
            <dl className="kv">
              <dt>workspace name</dt>
              <dd>{workspaceName}</dd>
              <dt>total contacts</dt>
              <dd>{totalContacts}</dd>
            </dl>
            {contacts.length > 0 && (
              <>
                <p
                  style={{
                    marginTop: '1rem',
                    color: 'var(--muted)',
                    fontSize: '0.875rem',
                  }}
                >
                  First {contacts.length} of {totalContacts}:
                </p>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                  {contacts.map((c) => (
                    <li key={c.id} style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                      <code style={{ color: 'var(--muted)' }}>[{c.__typename}]</code> {c.name}
                      {c.__typename === 'PersonContact' && c.email ? (
                        <>
                          {' '}
                          — <span style={{ color: 'var(--muted)' }}>{c.email}</span>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
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
        <a className="button button-secondary" href="/workspaces">
          Switch workspace
        </a>
        <a
          className="button button-secondary"
          href={`${env.webUrlBase()}/app/${session.workspaceId}/settings/connected-apps`}
        >
          Manage / revoke access in T3OS →
        </a>
      </div>

      <div className="footer">
        <strong>Sign out vs revoke:</strong> &quot;Sign out&quot; clears this app&apos;s credentials
        but leaves your grant and preferred workspace intact, so signing in again skips consent when
        the scopes are unchanged. &quot;Switch workspace&quot; targets another known grant or lets
        T3OS collect a new choice. The &quot;Manage / revoke&quot; link deletes the grant entirely —
        once revoked, the same token stops working immediately, even before expiry. See{' '}
        <a href="https://github.com/EquipmentShare/t3os-examples">the README</a> for the wire-level
        details.
      </div>
    </main>
  );
}
