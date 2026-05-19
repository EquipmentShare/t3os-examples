import Link from 'next/link';

export default function Terms() {
  return (
    <main>
      <h1>Terms of Use</h1>
      <p className="subtitle">
        This is a hello-world reference application maintained by EquipmentShare to demonstrate the
        T3OS sign-in-only OIDC flow.
      </p>

      <h2>Use of this app</h2>
      <p>
        You may use this app to walk through the &quot;Sign in with T3OS&quot; flow with any T3OS
        account. The app is provided &quot;as-is,&quot; with no SLA, uptime guarantee, or warranty
        of any kind. It may be taken offline, redeployed, or replaced at any time.
      </p>

      <h2>What you grant by signing in</h2>
      <p>
        This app requests <code>openid profile email offline_access</code> only — no T3OS workspace
        scopes. It cannot read your workspace data, your contacts, or anything other than the
        identity claims you see on the signed-in page. You can revoke the grant at any time from the
        T3OS web app&apos;s connected-apps settings page.
      </p>

      <h2>License</h2>
      <p>
        The source code is MIT-licensed. You may copy, adapt, or redistribute it. See the{' '}
        <a href="https://github.com/EquipmentShare/t3os-examples/blob/main/LICENSE">LICENSE file</a>{' '}
        for the full text.
      </p>

      <p>
        <Link href="/">← Back</Link>
      </p>
    </main>
  );
}
