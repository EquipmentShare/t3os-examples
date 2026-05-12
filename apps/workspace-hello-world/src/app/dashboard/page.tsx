import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { gqlWithApiKey } from '@/lib/graphql';
import { getSession } from '@/lib/session';
import { loadInstall } from '@/lib/storage';

export const dynamic = 'force-dynamic';

interface WorkspaceData {
  getWorkspaceById: { id: string; name: string };
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
  let queryError: string | null = null;
  try {
    const data = await gqlWithApiKey<WorkspaceData>(
      stored.apiKey,
      'query Q($id: String!) { getWorkspaceById(id: $id) { id name } }',
      { id: session.workspaceId },
    );
    workspaceName = data.getWorkspaceById.name;
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  const manageUrl = `${env.workspaceSettingsUrlBase()}/app/${session.workspaceId}/settings`;

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
