import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const session = await getSession();
  if (session.user && !error) {
    redirect('/signed-in');
  }

  return (
    <main>
      <h1>T3OS OIDC Hello World</h1>
      <p className="subtitle">
        Sign in with T3OS as a pure OpenID Connect identity provider — no workspace pick, no ERP API
        access. This is the reference for &quot;Sign in with T3OS&quot; buttons in third-party apps.
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
            Generates a PKCE verifier + S256 challenge + CSRF state + nonce, stashes them in the
            session cookie.
          </li>
          <li>
            Redirects you to Auth0&apos;s <code>/authorize</code> with{' '}
            <code>scope=openid profile email offline_access</code> and a required{' '}
            <code>audience</code> param (see Gotcha 1 below).
          </li>
          <li>Auth0 signs you in. No T3OS workspace consent screen.</li>
          <li>
            T3OS redirects back to <code>/oauth/callback?code=...&amp;state=...</code>.
          </li>
          <li>
            This app POSTs the code to <code>/oauth/token</code>, then <strong>verifies</strong> the{' '}
            <code>id_token</code> against Auth0&apos;s JWKS — pinning <code>iss</code>,{' '}
            <code>aud === client_id</code>, AND <code>azp === client_id</code> (see Gotcha 2).
          </li>
          <li>
            Identity claims (<code>email</code>, <code>name</code>, <code>picture</code>,{' '}
            <code>https://es-erp/uid</code>) are read from the <strong>id_token</strong>, not the
            access_token (see Gotcha 3).
          </li>
        </ol>
      </div>

      <h2>The three gotchas this example exists to make concrete</h2>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          <strong>
            1. <code>audience</code> is required.
          </strong>{' '}
          Even though this app never calls the T3OS API, omitting <code>audience</code> on the{' '}
          <code>/authorize</code> URL produces <code>error=grant_required</code> at the callback. We
          pass the standard ERP delegated audience.
        </p>
        <p>
          <strong>
            2. Pin <code>azp</code> on verify (conditionally).
          </strong>{' '}
          Auth0 tenants can have multiple apps sharing one API audience. Checking{' '}
          <code>aud === client_id</code> alone lets you accept id_tokens minted for sibling apps.
          The verifier here also checks <code>azp === client_id</code> — but only when{' '}
          <code>azp</code> is present (per OIDC Core §5 it&apos;s only required when{' '}
          <code>aud</code> is multi-valued).
        </p>
        <p>
          <strong>3. id_token, not access_token, for identity.</strong> Auth0 still issues an
          access_token as a side effect of the <code>audience</code> param, but for sign-in-only
          flows T3OS deliberately suppresses its identity claims. Read identity off the id_token.
        </p>
      </div>

      <div className="actions">
        <a className="button" href="/sign-in">
          Sign in with T3OS
        </a>
        <a
          className="button button-secondary"
          href="https://github.com/EquipmentShare/t3os-examples/tree/main/apps/oidc-hello-world"
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
