import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // If we already have a session, skip the landing page.
  const session = await getSession();
  if (session.accessToken) {
    redirect('/dashboard');
  }

  const { error } = await searchParams;

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
          <li>Auth0 routes you through sign-in and the T3OS consent screen.</li>
          <li>
            T3OS redirects you back to <code>/callback?code=...&state=...</code>.
          </li>
          <li>
            This app POSTs to Auth0&apos;s <code>/oauth/token</code> with the code, verifier, and
            client secret.
          </li>
          <li>
            The access token is decoded for its <code>https://es-erp/workspace_id</code> claim;
            everything goes into the session cookie.
          </li>
        </ol>
      </div>

      <div className="actions">
        <a className="button" href="/sign-in">
          Sign in with T3OS
        </a>
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
