import Link from 'next/link';

export default function Terms() {
  return (
    <main>
      <h1>Terms of Use</h1>
      <p className="subtitle">
        This is a hello-world reference application maintained by EquipmentShare to demonstrate the
        T3OS workspace-installed auth flow.
      </p>

      <h2>Use of this app</h2>
      <p>
        You may install this app into a T3OS workspace you administer to walk through the auth flow.
        The app is provided &quot;as-is,&quot; with no SLA, uptime guarantee, or warranty of any
        kind. It may be taken offline, redeployed, or replaced at any time.
      </p>

      <h2>What you grant by installing</h2>
      <p>
        When a workspace admin completes the install screen, T3OS grants this app the{' '}
        <code>all_resources_reader</code> scope on the selected workspace. That scope is read-only —
        the app cannot create, update, or delete data in the workspace. You can uninstall at any
        time from the T3OS workspace settings page; uninstall takes effect immediately.
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
