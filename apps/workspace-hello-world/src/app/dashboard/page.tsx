import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { gqlWithApiKey } from '@/lib/graphql';
import { getSession } from '@/lib/session';
import { loadInstall } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Single GraphQL round-trip pulling both the workspace summary and the first
// few contacts. Both selections share the same X-API-Key auth check —
// bundling them keeps the dashboard responsive and exercises a richer slice
// of the API.
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
  if (!session.workspaceId) {
    redirect('/');
  }

  const stored = await loadInstall(session.workspaceId);
  if (!stored) {
    redirect('/?error=not_installed_or_uninstalled');
  }

  let workspaceName: string | null = null;
  let contacts: ContactItem[] = [];
  let totalContacts = 0;
  let queryError: string | null = null;
  try {
    const data = await gqlWithApiKey<DashboardData>(stored.apiKey, DASHBOARD_QUERY, {
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

  const manageUrl = `${env.webUrlBase()}/app/${session.workspaceId}/settings/installed-apps`;

  return (
    <main>
      <h1>Installed in T3OS workspace</h1>
      <p className="subtitle">
        The install token was verified against T3OS&apos;s JWKS, the API key is encrypted in Vercel
        KV, and one live GraphQL call confirms the key authenticates against T3OS.
      </p>

      <h2>From the install token (verified via JWKS)</h2>
      <div className="card">
        <dl className="kv">
          <dt>workspace_id</dt>
          <dd>{session.workspaceId}</dd>
          <dt>app_id</dt>
          <dd>{stored.appId}</dd>
          <dt>principal_id</dt>
          <dd>{stored.principalId}</dd>
          <dt>scopes</dt>
          <dd>{stored.scopes.join(', ')}</dd>
          <dt>installed at</dt>
          <dd>{stored.installedAt}</dd>
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
            Forget this browser
          </button>
        </form>
        <a className="button button-secondary" href={manageUrl}>
          Manage / uninstall in T3OS →
        </a>
      </div>

      <div className="footer">
        <strong>Forget vs uninstall:</strong> &quot;Forget this browser&quot; just clears the
        session cookie — the API key stays valid in KV and the install stays active on T3OS&apos;s
        side. To actually uninstall, use the &quot;Manage / uninstall&quot; link, which goes to
        T3OS&apos;s workspace settings page. Uninstalling deletes the principal and revokes the API
        key immediately — the same key stops authenticating, and the next request from this app with
        that key will fail.
      </div>
    </main>
  );
}
