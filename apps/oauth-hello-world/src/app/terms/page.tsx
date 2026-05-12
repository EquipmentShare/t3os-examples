import Link from 'next/link';

export default function Terms() {
  return (
    <main>
      <h1>Terms of Use</h1>
      <p className="subtitle">
        This is a hello-world reference application maintained by EquipmentShare to demonstrate the
        T3OS user-delegated OAuth flow.
      </p>

      <h2>Use of this app</h2>
      <p>
        You may use this app to walk through the T3OS OAuth flow against a workspace you have access
        to. The app is provided &quot;as-is,&quot; with no SLA, uptime guarantee, or warranty of any
        kind. It may be taken offline, redeployed, or replaced at any time.
      </p>

      <h2>What you grant by signing in</h2>
      <p>
        When you complete the consent screen, you grant this app the{' '}
        <code>all_resources_reader</code> scope on the workspace you select. That scope is read-only
        — the app cannot create, update, or delete data in your workspace. You can revoke the grant
        at any time from the T3OS web app&apos;s connected-apps settings page.
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
