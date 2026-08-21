'use client';

/* eslint-disable @next/next/no-img-element -- Workspace and identity-provider images can use arbitrary HTTPS hosts. */

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  filterAccountWorkspaces,
  initials,
  type AccountWorkspaceMenuProps,
  type AccountWorkspaceMenuUser,
  type AccountWorkspaceMenuWorkspace,
} from './account-workspace-menu-model';
import styles from './account-workspace-menu.module.css';

export type {
  AccountWorkspaceMenuProps,
  AccountWorkspaceMenuUser,
  AccountWorkspaceMenuWorkspace,
} from './account-workspace-menu-model';

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={open ? styles.chevronOpen : undefined} aria-hidden="true" viewBox="0 0 20 20">
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

function WorkspaceAvatar({
  workspace,
  compact = false,
}: {
  workspace: AccountWorkspaceMenuWorkspace;
  compact?: boolean;
}) {
  const className = `${styles.avatar} ${styles.workspaceAvatar}${compact ? ` ${styles.compactAvatar}` : ''}`;
  if (workspace.logoUrl) {
    return <img className={className} src={workspace.logoUrl} alt="" />;
  }
  return (
    <span className={`${className} ${styles.workspaceFallback}`} aria-hidden="true">
      {initials(workspace.name).slice(0, 1)}
    </span>
  );
}

function UserAvatar({ user }: { user: AccountWorkspaceMenuUser }) {
  if (user.pictureUrl)
    return <img className={`${styles.avatar} ${styles.userAvatar}`} src={user.pictureUrl} alt="" />;
  return (
    <span
      className={`${styles.avatar} ${styles.userAvatar} ${styles.userFallback}`}
      aria-hidden="true"
    >
      {initials(user.name)}
    </span>
  );
}

export function AccountWorkspaceMenu({
  currentWorkspaceId,
  workspaces,
  user,
  connectWorkspaceHref,
  signOutAction,
  className,
  defaultOpen = false,
  style,
}: AccountWorkspaceMenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const current = workspaces.find((workspace) => workspace.id === currentWorkspaceId);
  const filtered = useMemo(() => filterAccountWorkspaces(workspaces, query), [query, workspaces]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setSearchOpen(false);
      setQuery('');
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  if (!current) return null;

  const close = () => {
    setOpen(false);
    setSearchOpen(false);
    setQuery('');
  };

  const moveMenuFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [],
    );
    if (!items.length) return;
    event.preventDefault();
    const activeIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (activeIndex + 1 + items.length) % items.length
            : (activeIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div
      className={`${styles.root}${className ? ` ${className}` : ''}`}
      ref={rootRef}
      style={style}
    >
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label={`Account and workspace: ${current.name}`}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() =>
              rootRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus(),
            );
          }
        }}
      >
        <WorkspaceAvatar workspace={current} compact />
        <span className={styles.currentName}>{current.name}</span>
        <UserAvatar user={user} />
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          id={menuId}
          className={styles.menu}
          role="menu"
          aria-label="Account and workspaces"
          onKeyDown={moveMenuFocus}
        >
          <div className={styles.menuHeader}>
            {searchOpen ? (
              <label className={styles.search}>
                <span className={styles.srOnly}>Search workspaces</span>
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Search workspaces…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <SearchIcon />
              </label>
            ) : (
              <button
                className={styles.menuTitle}
                type="button"
                onClick={() => setSearchOpen(true)}
              >
                <span>Your workspaces</span>
                <SearchIcon />
              </button>
            )}
          </div>

          <div className={styles.workspaceList}>
            {filtered.length ? (
              filtered.map((workspace) => {
                const isCurrent = workspace.id === currentWorkspaceId;
                return (
                  <a
                    className={`${styles.workspaceRow}${isCurrent ? ` ${styles.currentWorkspace}` : ''}`}
                    href={workspace.href}
                    key={workspace.id}
                    role="menuitem"
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={close}
                  >
                    <WorkspaceAvatar workspace={workspace} />
                    <span className={styles.workspaceCopy}>
                      <strong>{workspace.name}</strong>
                      <small>
                        {workspace.description ||
                          (isCurrent ? 'Current workspace' : 'Connected workspace')}
                      </small>
                    </span>
                    {isCurrent && (
                      <span className={styles.check} aria-label="Current workspace">
                        ✓
                      </span>
                    )}
                  </a>
                );
              })
            ) : (
              <p className={styles.empty}>No matching workspaces</p>
            )}
          </div>

          <div className={styles.menuFooter}>
            <a
              className={styles.footerAction}
              href={connectWorkspaceHref}
              role="menuitem"
              onClick={close}
            >
              <span aria-hidden="true">＋</span>
              Connect another workspace
            </a>
            <div className={styles.divider} />
            <div className={styles.accountRow}>
              <UserAvatar user={user} />
              <span className={styles.accountCopy}>
                <strong>{user.name}</strong>
                <small>{user.email || 'Signed in with T3'}</small>
              </span>
              <form action={signOutAction} method="post">
                <button className={styles.signOut} type="submit" role="menuitem">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
