import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage() {
  const session = await getSession();
  if (!session.accessToken || !session.workspaceId) redirect('/');

  const workspaceIds = [
    session.workspaceId,
    ...(session.knownWorkspaceIds ?? []).filter((id) => id !== session.workspaceId),
  ];

  return (
    <main>
      <h1>Choose workspace</h1>
      <p className="subtitle">
        Switching revalidates your T3OS membership and the app grant for that workspace.
      </p>
      <div className="card">
        {workspaceIds.map((workspaceId) => (
          <p key={workspaceId}>
            <a href={`/sign-in?workspace=${encodeURIComponent(workspaceId)}`}>
              <code>{workspaceId}</code> —{' '}
              {workspaceId === session.workspaceId ? 'Current' : 'Switch'} →
            </a>
          </p>
        ))}
        <p>
          <a href="/sign-in?choose=1">Connect another workspace — choose in T3OS →</a>
        </p>
      </div>
    </main>
  );
}
