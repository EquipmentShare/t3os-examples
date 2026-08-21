import { redirect } from 'next/navigation';
import { normalizeWorkspaceTarget } from '@/lib/oauth';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; workspace?: string }>;
}) {
  const { error, workspace } = await searchParams;
  const targetWorkspaceId = normalizeWorkspaceTarget(workspace);

  // If a session exists AND there's no error in the URL, the user is
  // already signed in — skip the landing page. We deliberately don't
  // try to call session.destroy() here even if the session is stale:
  // Server Components can read cookies but can't modify them, so the
  // cleanup goes through /sign-out (a Route Handler) instead. The
  // /sign-in flow also clears active credentials before starting.
  const session = await getSession();
  if (session.accessToken && !error) {
    if (targetWorkspaceId && targetWorkspaceId !== session.workspaceId) {
      redirect(`/sign-in?workspace=${encodeURIComponent(targetWorkspaceId)}`);
    }
    redirect('/dashboard');
  }

  const signInHref = targetWorkspaceId
    ? `/sign-in?workspace=${encodeURIComponent(targetWorkspaceId)}`
    : '/sign-in';

  return (
    <main>
      <h1>T3OS OAuth Hello World</h1>
      <p className="subtitle">
        Sign in with T3OS to walk through the user-delegated OAuth flow end-to-end.
      </p>

      {error && (
        <div className="error">
          <strong>Auth flow ended with an error: </strong>
          {error}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What clicking the button does</h2>
        <ol>
          <li>
            Generates a PKCE verifier + S256 challenge + CSRF state, stashes them in the session
            cookie.
          </li>
          <li>
            Redirects you to Auth0&apos;s <code>/authorize</code> with the challenge + your
            registered client id.
          </li>
          <li>
            Auth0 signs you in. T3OS shows consent only when there is no matching active grant for
            the requested workspace and exact scopes.
          </li>
          <li>
            T3OS redirects you back to <code>/callback?code=...&state=...</code>.
          </li>
          <li>
            This app POSTs to Auth0&apos;s <code>/oauth/token</code> with the code, verifier, and
            client secret.
          </li>
          <li>
            Both tokens are verified before their identity and workspace claims are stored in the
            encrypted session cookie.
          </li>
        </ol>
      </div>

      <div className="actions">
        <a className="button" href={signInHref}>
          Continue with T3OS
        </a>
        {!targetWorkspaceId && (
          <a className="button button-secondary" href="/sign-in?choose=1">
            Choose another workspace
          </a>
        )}
        <a
          className="button button-secondary"
          href="https://github.com/EquipmentShare/t3os-examples/tree/main/apps/oauth-hello-world"
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
