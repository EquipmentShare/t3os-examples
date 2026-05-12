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

  // Where T3OS hosts its install screen for this app.
  const installUrl = `${env.installUrlBase()}/oauth/install?appId=${env.appId()}`;

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
        <h2 style={{ marginTop: 0 }}>What clicking install does</h2>
        <ol>
          <li>Sends you to T3OS&apos;s hosted install screen for this app.</li>
          <li>You sign in to T3OS (if not already) and pick a workspace you can install into.</li>
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

      <div className="actions">
        <a className="button" href={installUrl}>
          Install in your workspace
        </a>
        <a
          className="button button-secondary"
          href="https://github.com/EquipmentShare/t3os-examples/tree/main/apps/workspace-hello-world"
        >
          View source
        </a>
      </div>

      <div className="footer">
        <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·{' '}
        <a href="https://github.com/EquipmentShare/t3os-examples/issues">Support</a>
      </div>
    </main>
  );
}
