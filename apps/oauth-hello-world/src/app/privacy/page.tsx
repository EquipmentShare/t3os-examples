import Link from 'next/link';

export default function Privacy() {
  return (
    <main>
      <h1>Privacy Policy</h1>
      <p className="subtitle">
        This page exists to satisfy the T3OS marketplace registration requirements and to be honest
        about what this hello-world app does with your data. It is not a real product.
      </p>

      <h2>What this app stores</h2>
      <p>
        After you sign in, this app stores the following in an encrypted, httpOnly cookie sent only
        to <code>t3os-oauth-hello-world.vercel.app</code>:
      </p>
      <ul>
        <li>Your Auth0 access token, refresh token, and id token.</li>
        <li>The expiry timestamp of the access token.</li>
        <li>
          The <code>workspace_id</code> claim from your access token.
        </li>
      </ul>
      <p>
        The cookie is sealed with a server-only key (via{' '}
        <a href="https://github.com/vvo/iron-session">iron-session</a>). The browser cannot read its
        contents.
      </p>

      <h2>What this app does NOT store</h2>
      <p>
        Nothing is written to a server-side database. There is no analytics tracking, no logging of
        request bodies, and no third-party data sharing. When you click &quot;Sign out&quot; the
        cookie is destroyed. When you revoke the grant via T3OS, the next request from this app will
        be rejected by T3OS and the session will be cleared automatically.
      </p>

      <h2>What this app reads from T3OS</h2>
      <p>
        With your consent, this app holds an access token scoped to{' '}
        <code>all_resources_reader</code>. It uses that scope to make one query:{' '}
        <code>getWorkspaceById</code>, which returns your workspace&apos;s name. No other queries
        are issued.
      </p>

      <h2>Source</h2>
      <p>
        This is a hello-world example. The source code is at{' '}
        <a href="https://github.com/EquipmentShare/t3os-examples">
          github.com/EquipmentShare/t3os-examples
        </a>
        . You can verify these claims by reading the code.
      </p>

      <p>
        <Link href="/">← Back</Link>
      </p>
    </main>
  );
}
