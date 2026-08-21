import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { fallbackWorkspaceName, WorkspaceSwitcher } from '@/components/workspace-switcher';

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage() {
  const session = await getSession();
  if (!session.accessToken || !session.workspaceId) redirect('/');

  const remembered =
    session.knownWorkspaces ??
    (session.knownWorkspaceIds ?? []).map((workspaceId) => ({
      workspaceId,
      name: fallbackWorkspaceName(workspaceId),
    }));
  const workspaces = [
    remembered.find((workspace) => workspace.workspaceId === session.workspaceId) ?? {
      workspaceId: session.workspaceId,
      name: fallbackWorkspaceName(session.workspaceId),
    },
    ...remembered.filter((workspace) => workspace.workspaceId !== session.workspaceId),
  ];

  return (
    <main>
      <h1>Choose workspace</h1>
      <p className="subtitle">
        Switching revalidates your T3OS membership and the app grant for that workspace.
      </p>
      <WorkspaceSwitcher
        workspaces={workspaces}
        currentWorkspaceId={session.workspaceId}
        display="panel"
      />
    </main>
  );
}
