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
        to <code>t3os-oidc-hello-world.vercel.app</code>:
      </p>
      <ul>
        <li>
          The identity claims read off your id_token — <code>sub</code>,{' '}
          <code>https://es-erp/uid</code>, <code>email</code>, <code>name</code>,{' '}
          <code>picture</code>.
        </li>
        <li>
          Your Auth0 refresh token (only so &quot;Sign out&quot; can call <code>/oauth/revoke</code>{' '}
          on it).
        </li>
        <li>The timestamp at which you signed in.</li>
      </ul>
      <p>
        The cookie is sealed with a server-only key (via{' '}
        <a href="https://github.com/vvo/iron-session">iron-session</a>). The browser cannot read its
        contents. We do not store the raw id_token or access_token.
      </p>

      <h2>What this app does NOT do</h2>
      <p>
        This app has no T3OS API access. Auth0 issues an access_token as a side effect of the
        sign-in flow, but for sign-in-only apps T3OS deliberately suppresses its identity claims —
        we drop it on the floor at the callback. There is no GraphQL client. Nothing in your T3OS
        workspace is read or written.
      </p>
      <p>
        Nothing is written to a server-side database. There is no analytics tracking, no logging of
        request bodies, and no third-party data sharing.
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
