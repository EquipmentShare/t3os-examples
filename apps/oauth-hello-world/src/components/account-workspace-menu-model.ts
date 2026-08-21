import type { CSSProperties } from 'react';

export interface AccountWorkspaceMenuWorkspace {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  href: string;
}

export interface AccountWorkspaceMenuUser {
  name: string;
  email?: string;
  pictureUrl?: string;
}

export interface AccountWorkspaceMenuProps {
  currentWorkspaceId: string;
  workspaces: readonly AccountWorkspaceMenuWorkspace[];
  user: AccountWorkspaceMenuUser;
  connectWorkspaceHref: string;
  signOutAction: string;
  className?: string;
  defaultOpen?: boolean;
  style?: CSSProperties;
}

export function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function filterAccountWorkspaces(
  workspaces: readonly AccountWorkspaceMenuWorkspace[],
  query: string,
) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return workspaces;
  return workspaces.filter((workspace) =>
    [workspace.name, workspace.description, workspace.id]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalized)),
  );
}
