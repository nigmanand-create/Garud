'use client';

import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import {
  createAdminUser,
  listAdminUsers,
  resetUserPassword,
  setUserDisabled,
  updateUserRole,
  type AdminUser,
  type AdminUsersResponse,
} from '@/lib/api/admin';
import { RequireAuth, useAuth } from '@/components/platform/AuthProvider';
import { useConfirmDialog } from '@/components/platform/ConfirmDialog';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  availableUserActions,
  roleForAccountType,
  temporaryPasswordNotice,
  type UserAction,
} from '@/lib/platform/admin-ops';
import { formatEnumLabel } from '@/lib/platform/labels';
import type { UserRole } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const ROLES: UserRole[] = ['PLATFORM_ADMIN', 'PARTNER', 'BUYER', 'GOVERNMENT'];
const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <Suspense fallback={<PlatformLoading />}>
        <UsersInner />
      </Suspense>
    </RequireAuth>
  );
}

type Secret = { email: string; password: string; title: string };

function UsersInner() {
  const { user: me } = useAuth();
  const params = useSearchParams();
  const { confirm, dialog } = useConfirmDialog();
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<'' | 'active' | 'disabled'>('');
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listAdminUsers({
      role: role || undefined,
      status: status || undefined,
      search,
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    })
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load users'),
      );
  }, [role, status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(work: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await work();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    await run(async () => {
      const res = await createAdminUser(newEmail.trim());
      setSecret({
        email: res.user.email,
        password: res.temporaryPassword,
        title: 'Admin created',
      });
      setNewEmail('');
    });
  }

  async function onAction(u: AdminUser, action: UserAction) {
    const copy: Record<UserAction, { title: string; message: string; destructive?: boolean }> = {
      promote: {
        title: `Promote ${u.email} to platform admin?`,
        message:
          'They will get full admin access (KYC, moderation, orders, users). Their sessions are signed out so the new role applies on next login.',
      },
      demote: {
        title: `Demote ${u.email}?`,
        message: `Role becomes ${formatEnumLabel(roleForAccountType(u.accountType))} (matching their account type). Their sessions are signed out.`,
        destructive: true,
      },
      reset: {
        title: `Reset password for ${u.email}?`,
        message:
          'A one-time temporary password is generated, existing sessions are signed out and the user must change it on next sign-in.',
        destructive: true,
      },
      disable: {
        title: `Disable ${u.email}?`,
        message: 'They will be signed out and unable to sign in until re-enabled.',
        destructive: true,
      },
      enable: {
        title: `Re-enable ${u.email}?`,
        message: 'They will be able to sign in again.',
      },
    };
    const ok = await confirm({
      ...copy[action],
      confirmLabel: 'Confirm',
    });
    if (!ok) return;
    await run(async () => {
      if (action === 'promote') {
        await updateUserRole(u.id, { role: 'PLATFORM_ADMIN' });
        setNotice(`${u.email} is now a platform admin.`);
      } else if (action === 'demote') {
        const next = roleForAccountType(u.accountType);
        await updateUserRole(u.id, { role: next, accountType: u.accountType });
        setNotice(`${u.email} is now ${formatEnumLabel(next)}.`);
      } else if (action === 'reset') {
        const res = await resetUserPassword(u.id);
        setSecret({
          email: u.email,
          password: res.temporaryPassword,
          title: 'Temporary password issued',
        });
      } else {
        await setUserDisabled(u.id, action === 'disable');
        setNotice(`${u.email} ${action === 'disable' ? 'disabled' : 're-enabled'}.`);
      }
    });
  }

  const pages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1;

  return (
    <div className="platform-admin-list-page">
      {dialog}
      <PlatformPageHeader
        title="Users & roles"
        subtitle="Create platform admins, promote or demote with guard rails, reset passwords and disable accounts. Every change lands in the audit log."
      />

      {error && <div className="platform-card platform-error">{error}</div>}
      {notice && (
        <div className="platform-card" role="status">
          {notice}
        </div>
      )}
      {secret && (
        <div className="platform-card" role="alert">
          <strong>{secret.title}</strong>
          <p>
            <code style={{ fontSize: '1.05rem', userSelect: 'all' }}>{secret.password}</code>
          </p>
          <p className="platform-text-sm platform-muted">
            {temporaryPasswordNotice(secret.email)}
          </p>
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-btn-sm"
            onClick={() => setSecret(null)}
          >
            I have copied it
          </button>
        </div>
      )}

      <form
        className="platform-card platform-admin-ops-section platform-form platform-filter-bar platform-admin-list-filter-bar"
        onSubmit={onCreate}
      >
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--grow-fill">
          <label htmlFor="new-admin-email">Invite a platform admin (email)</label>
          <input
            id="new-admin-email"
            type="email"
            className="mod-filter-input"
            placeholder="ops@garudhub.in"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--action">
          <label className="platform-admin-list-filter-action-label" aria-hidden="true">
            &nbsp;
          </label>
          <button type="submit" className="platform-btn platform-btn-sm" disabled={busy}>
            Create admin
          </button>
        </div>
      </form>

      <form
        className="platform-card platform-admin-ops-section platform-form platform-filter-bar platform-admin-list-filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setSearch(searchInput);
        }}
      >
        <div className="platform-admin-list-filter-field">
          <label htmlFor="user-role">Role</label>
          <select
            id="user-role"
            className="mod-filter-select"
            value={role}
            onChange={(e) => {
              setRole((e.target.value || '') as UserRole | '');
              setPage(0);
            }}
          >
            <option value="">All{data ? ` (${Object.values(data.roleCounts).reduce((a, b) => a + b, 0)})` : ''}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {formatEnumLabel(r)}
                {data ? ` (${data.roleCounts[r]})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="platform-admin-list-filter-field">
          <label htmlFor="user-status">Status</label>
          <select
            id="user-status"
            className="mod-filter-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | 'active' | 'disabled');
              setPage(0);
            }}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--grow">
          <label htmlFor="user-search">Search</label>
          <input
            id="user-search"
            type="search"
            className="mod-filter-input"
            placeholder="Email or company"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--action">
          <label className="platform-admin-list-filter-action-label" aria-hidden="true">
            &nbsp;
          </label>
          <button type="submit" className="platform-btn platform-btn-sm">
            Apply
          </button>
        </div>
      </form>

      <div
        className="platform-card platform-admin-ops-section platform-card--flush"
        aria-busy={!data && !error}
      >
        {!data && !error ? (
          <PlatformLoading />
        ) : data ? (
          <>
          <div className="platform-table-wrap">
            <table className="platform-table mod-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="platform-table-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6}>No users match these filters.</td>
                  </tr>
                )}
                {data.items.map((u) => {
                  const actions = availableUserActions(u, me?.id);
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.email}
                        {u.id === me?.id && <span className="platform-text-muted"> (you)</span>}
                      </td>
                      <td>{formatEnumLabel(u.role)}</td>
                      <td className="platform-table-cell-wrap">
                        {u.organization?.companyName ?? '—'}
                        <div className="platform-text-muted">{formatEnumLabel(u.accountType)}</div>
                      </td>
                      <td>
                        {u.disabledAt ? (
                          <StatusBadge status="REJECTED" label="Disabled" />
                        ) : (
                          <StatusBadge status="ACTIVE" label="Active" />
                        )}
                        {u.mustChangePassword && (
                          <div className="platform-text-muted">Temp password</div>
                        )}
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="platform-table-actions-row">
                        {actions.length === 0 && '—'}
                        {actions.map((a) => (
                          <button
                            key={a}
                            type="button"
                            className="platform-btn platform-btn-secondary platform-btn-sm"
                            disabled={busy}
                            onClick={() => onAction(u, a)}
                          >
                            {a === 'promote'
                              ? 'Make admin'
                              : a === 'demote'
                                ? 'Demote'
                                : a === 'reset'
                                  ? 'Reset password'
                                  : a === 'disable'
                                    ? 'Disable'
                                    : 'Enable'}
                          </button>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="platform-admin-list-pagination">
            <span className="platform-text-sm platform-muted">
              {data.total} user{data.total === 1 ? '' : 's'} · {data.activeAdmins} active admin
              {data.activeAdmins === 1 ? '' : 's'} · page {page + 1} of {pages}
            </span>
            <span className="platform-admin-list-pagination-actions">
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
              >
                Previous
              </button>
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-sm"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </span>
          </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
