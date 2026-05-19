import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function SignedIn() {
  const session = await getSession();
  if (!session.user) {
    // No verified identity — bounce to /sign-out (Route Handler) which can
    // safely clear the cookie and redirect to /.
    redirect('/sign-out');
  }

  const { user } = session;

  return (
    <main>
      <h1>
        Signed in to T3OS{' '}
        <span style={{ color: 'var(--muted)', fontSize: '1rem', fontWeight: 400 }}>(OIDC)</span>
      </h1>
      <p className="subtitle">
        The sign-in round-trip succeeded. Everything below was read from the verified id_token —
        this app has no access to your workspace data.
      </p>

      <h2>Who you are (from the id_token)</h2>
      <div className="card">
        {user.picture && (
          // next/image needs a remote-patterns config; avatar URLs come from
          // arbitrary identity providers wired into the Auth0 tenant so the
          // domain list is unbounded. Plain <img> is fine for a hello-world.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture} alt="" className="avatar" referrerPolicy="no-referrer" />
        )}
        <strong>{user.name ?? '(no name claim)'}</strong>
        {user.email && (
          <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>{user.email}</span>
        )}
      </div>

      <h2>Claims the app actually trusts</h2>
      <div className="card">
        <dl className="kv">
          <dt>sub</dt>
          <dd>{user.sub}</dd>
          <dt>https://es-erp/uid</dt>
          <dd>{user.uid ?? '(not set — backend may still be rolling this claim out)'}</dd>
          <dt>email</dt>
          <dd>{user.email ?? '(not set)'}</dd>
          <dt>name</dt>
          <dd>{user.name ?? '(not set)'}</dd>
          <dt>picture</dt>
          <dd>{user.picture ?? '(not set)'}</dd>
          <dt>signed in at</dt>
          <dd>{new Date(session.signedInAt ?? 0).toISOString()}</dd>
        </dl>
      </div>

      <h2>What this app deliberately does NOT have</h2>
      <div className="card">
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          <li>
            <strong>No workspace context.</strong> Sign-in-only flows don&apos;t show the T3OS
            workspace picker. There&apos;s no <code>workspace_id</code> anywhere in this session.
          </li>
          <li>
            <strong>No access_token in storage.</strong> Auth0 issued one as a side effect of the{' '}
            <code>audience</code> param, but for sign-in-only flows T3OS suppresses its identity
            claims and it can&apos;t be used against the ERP API. We dropped it on the floor.
          </li>
          <li>
            <strong>No GraphQL client.</strong> Compare to{' '}
            <a href="https://github.com/EquipmentShare/t3os-examples/tree/main/apps/oauth-hello-world">
              oauth-hello-world
            </a>{' '}
            where the dashboard makes a real <code>getWorkspaceById</code> call.
          </li>
        </ul>
      </div>

      <div className="actions">
        <form action="/sign-out" method="post" style={{ display: 'inline' }}>
          <button type="submit" className="button">
            Sign out
          </button>
        </form>
        <a className="button button-secondary" href={`${env.webUrlBase()}/settings/connected-apps`}>
          Manage connected apps in T3OS →
        </a>
      </div>

      <div className="footer">
        <strong>Sign out vs revoke:</strong> &quot;Sign out&quot; clears this app&apos;s session
        cookie and (if a refresh_token is present) calls Auth0&apos;s <code>/oauth/revoke</code>. It
        does NOT clear your Auth0 SSO cookie — signing back in will skip the password prompt. To
        fully revoke this app&apos;s grant, use the &quot;Manage connected apps&quot; link.
      </div>
    </main>
  );
}
