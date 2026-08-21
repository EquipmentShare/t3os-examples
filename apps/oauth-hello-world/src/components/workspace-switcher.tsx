'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface WorkspaceOption {
  workspaceId: string;
  name: string;
  description?: string;
  logoUrl?: string;
}

export function fallbackWorkspaceName(workspaceId: string) {
  const suffix = workspaceId.length > 12 ? workspaceId.slice(-8) : workspaceId;
  return `Workspace ${suffix}`;
}

export function workspaceInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'W';
}

export function filterWorkspaces(workspaces: WorkspaceOption[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return workspaces;
  return workspaces.filter((workspace) =>
    [workspace.name, workspace.description, workspace.workspaceId]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalized)),
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function WorkspaceAvatar({ workspace }: { workspace: WorkspaceOption }) {
  if (workspace.logoUrl) {
    // Workspace-managed logos may use any HTTPS host, so Next Image cannot safely pre-allowlist them.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="workspace-avatar" src={workspace.logoUrl} alt="" />;
  }
  return (
    <span className="workspace-avatar workspace-avatar-fallback" aria-hidden="true">
      {workspaceInitial(workspace.name)}
    </span>
  );
}

function WorkspaceMenu({
  workspaces,
  currentWorkspaceId,
  onNavigate,
}: {
  workspaces: WorkspaceOption[];
  currentWorkspaceId: string;
  onNavigate?: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => filterWorkspaces(workspaces, query), [query, workspaces]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  return (
    <div className="workspace-menu" role="menu" aria-label="Your workspaces">
      <div className="workspace-menu-head">
        {searchOpen ? (
          <label className="workspace-search">
            <span className="sr-only">Search workspaces</span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search workspaces…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setQuery('');
                  setSearchOpen(false);
                }
              }}
            />
            <SearchIcon />
          </label>
        ) : (
          <button
            className="workspace-menu-title"
            type="button"
            onClick={() => setSearchOpen(true)}
          >
            <span>Your workspaces</span>
            <SearchIcon />
          </button>
        )}
      </div>

      <div className="workspace-options">
        {filtered.length ? (
          filtered.map((workspace) => {
            const current = workspace.workspaceId === currentWorkspaceId;
            return (
              <a
                className={`workspace-option${current ? ' current' : ''}`}
                href={`/sign-in?workspace=${encodeURIComponent(workspace.workspaceId)}`}
                key={workspace.workspaceId}
                role="menuitem"
                aria-current={current ? 'page' : undefined}
                onClick={onNavigate}
              >
                <WorkspaceAvatar workspace={workspace} />
                <span className="workspace-option-copy">
                  <strong>{workspace.name}</strong>
                  <span>
                    {workspace.description ||
                      (current ? 'Current workspace' : 'Connected workspace')}
                  </span>
                </span>
                {current && (
                  <span className="workspace-check" aria-label="Current workspace">
                    ✓
                  </span>
                )}
              </a>
            );
          })
        ) : (
          <p className="workspace-empty">No matching workspaces</p>
        )}
      </div>

      <div className="workspace-menu-foot">
        <a href="/sign-in?choose=1" onClick={onNavigate}>
          <span aria-hidden="true">＋</span>
          Connect another workspace
        </a>
      </div>
    </div>
  );
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  display = 'popover',
}: {
  workspaces: WorkspaceOption[];
  currentWorkspaceId: string;
  display?: 'popover' | 'panel';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current =
    workspaces.find((workspace) => workspace.workspaceId === currentWorkspaceId) ?? workspaces[0];

  useEffect(() => {
    if (display !== 'popover' || !open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [display, open]);

  if (!current) return null;
  if (display === 'panel') {
    return <WorkspaceMenu workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} />;
  }

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button
        className="workspace-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <WorkspaceAvatar workspace={current} />
        <span>{current.name}</span>
        <svg className={open ? 'open' : ''} aria-hidden="true" viewBox="0 0 20 20">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <WorkspaceMenu
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onNavigate={() => setOpen(false)}
        />
      )}
    </div>
  );
}
