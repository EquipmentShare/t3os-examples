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
      <p>When you install this app into a workspace, this app stores:</p>
      <ul>
        <li>
          In Vercel KV (keyed by workspace id): the workspace&apos;s API key, encrypted with
          AES-256-GCM using a server-only key. Plus the app id, principal id, granted scopes, and
          install timestamp.
        </li>
        <li>
          In an httpOnly cookie sent only to <code>t3os-workspace-hello-world.vercel.app</code>: the
          id of the workspace this browser most recently installed into.
        </li>
      </ul>

      <h2>What this app does NOT store</h2>
      <p>
        Nothing else. No analytics tracking, no logging of request bodies, no third-party data
        sharing. The plaintext API key is held in process memory only long enough to encrypt it, and
        the install-token JWT is discarded after verification.
      </p>

      <h2>What this app reads from T3OS</h2>
      <p>
        With workspace consent, this app uses the <code>all_resources_reader</code> scope to make
        one query: <code>getWorkspaceById</code>, which returns the workspace&apos;s name. No other
        queries are issued.
      </p>

      <h2>Uninstalling</h2>
      <p>
        When you uninstall the app from your T3OS workspace settings, T3OS revokes the API key and
        deletes the principal. The KV record on this side is not automatically cleaned up — it
        contains an API key that no longer authenticates, so it is effectively dead.
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
