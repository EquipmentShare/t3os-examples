import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { getSession } from '@/lib/session';
import { loadInstall } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // If this browser already completed an install AND the KV record is still
  // present (i.e., not uninstalled), skip the landing page.
  const session = await getSession();
  if (session.workspaceId) {
    const stored = await loadInstall(session.workspaceId);
    if (stored) {
      redirect('/dashboard');
    }
  }

  const { error } = await searchParams;

  // The T3OS install screen requires BOTH `appId` and `workspaceId` in the
  // URL — it has no UI for picking a workspace. In production marketplace
  // flows the user lands on the install page from inside a workspace
  // context (the URL is constructed by T3OS itself, with the active
  // workspace baked in). For this hello-world, where the entry point is
  // an anonymous landing page, we expose a small form that collects the
  // workspace id and submits it as a GET to T3OS's /oauth/install.
  const installFormAction = `${env.installUrlBase()}/oauth/install`;

  return (
    <main>
      <h1>T3OS Workspace Hello World</h1>
      <p className="subtitle">
        Install this app into a workspace to walk through the workspace-installed auth flow
        end-to-end.
      </p>

      {error && (
        <div className="error">
          <strong>Install ended with an error: </strong>
          {error}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What submitting the form does</h2>
        <ol>
          <li>
            Sends you to T3OS&apos;s hosted install screen with <code>appId</code> and{' '}
            <code>workspaceId</code> in the URL.
          </li>
          <li>You sign in to T3OS (if not already) and click Install.</li>
          <li>
            T3OS&apos;s IAM service calls <code>installWorkspaceApp</code>, which mints a
            workspace-scoped API key and packages it inside a one-shot RS256 JWT.
          </li>
          <li>
            T3OS redirects you to this app at <code>/install-complete?install_token=...</code>.
          </li>
          <li>
            We verify the JWT against T3OS&apos;s JWKS, extract the API key, encrypt it, and store
            it in Vercel KV keyed by workspace id.
          </li>
        </ol>
      </div>

      <form action={installFormAction} method="get" className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Install in your workspace</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Paste the id of any T3OS workspace you have admin access to. You can find it in any T3OS
          URL: <code>https://erp.estrack.com/app/&lt;workspace_id&gt;/...</code>
        </p>
        <input type="hidden" name="appId" value={env.appId()} />
        <label
          htmlFor="workspaceId"
          style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}
        >
          Workspace id
        </label>
        <input
          id="workspaceId"
          type="text"
          name="workspaceId"
          required
          placeholder="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        />
        <div className="actions" style={{ marginTop: 0 }}>
          <button type="submit" className="button">
            Continue to T3OS &rarr;
          </button>
          <a
            className="button button-secondary"
            href="https://github.com/EquipmentShare/t3os-examples/tree/main/apps/workspace-hello-world"
          >
            View source
          </a>
        </div>
      </form>

      <div className="footer">
        <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·{' '}
        <a href="https://github.com/EquipmentShare/t3os-examples/issues">Support</a>
      </div>
    </main>
  );
}
