'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  UnlockKeyhole,
  UserCog,
  Users,
  X,
  type LucideIcon
} from 'lucide-react';
import { fetchAdminUsers, fetchUserModulePermissions, setUserAccess, setUserModulePermission } from '@/lib/admin-services';
import { adminModules, type AdminModule } from '@/lib/module-access';
import type { AdminRole, AdminUser, UserModulePermission } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonPanel } from '@/components/ui/skeleton';

const roleOptions: Array<{ value: AdminRole; label: string; helper: string }> = [
  { value: 'developer', label: 'Desenvolvedor', helper: 'Acesso total ao sistema' },
  { value: 'admin', label: 'Administrador', helper: 'Pode receber módulos liberados' },
  { value: 'equipe', label: 'Equipe', helper: 'Operação conforme módulos' },
  { value: 'motoboy', label: 'Entregador', helper: 'Entrega conforme módulos' },
  { value: 'cliente', label: 'Cliente', helper: 'Sem acesso ao painel' }
];

export function UsersPermissionsPage() {
  const { profile } = useAdminStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissions, setPermissions] = useState<UserModulePermission[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'todos'>('todos');
  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleMenuUserId, setRoleMenuUserId] = useState('');
  const canManageDeveloper = profile?.role === 'developer';
  const assignableRoleOptions = useMemo(() => (canManageDeveloper ? roleOptions : roleOptions.filter((role) => role.value !== 'developer')), [canManageDeveloper]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const nextUsers = await fetchAdminUsers();
      setUsers(nextUsers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      setLoadingPermissions(true);
      setError('');
      setPermissions(await fetchUserModulePermissions(userId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar permissões do usuário.');
      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) || null, [selectedUserId, users]);
  const filteredUsers = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchQuery = !clean || [user.name, user.email, user.roleLabel].join(' ').toLowerCase().includes(clean);
      const matchRole = roleFilter === 'todos' || user.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [query, roleFilter, users]);

  const metrics = useMemo(() => {
    const teamUsers = users.filter((user) => user.role !== 'cliente');
    return {
      total: users.length,
      roles: new Set(users.map((user) => user.role)).size,
      active: teamUsers.filter((user) => user.active).length,
      inactive: teamUsers.filter((user) => !user.active).length
    };
  }, [users]);

  async function handleSelectUser(userId: string) {
    setSuccess('');
    setRoleMenuUserId('');
    setSelectedUserId(userId);
    await loadPermissions(userId);
  }

  async function updateUserRole(user: AdminUser, role: AdminRole, savingKey = 'access') {
    try {
      setSaving(savingKey);
      setError('');
      setSuccess('');
      setRoleMenuUserId('');
      const nextActive = role !== 'cliente';
      const updated = await setUserAccess(user.id, role, nextActive);
      if (updated) {
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      }
      setSuccess(`Acesso de ${user.name} atualizado para ${roleLabel(role)}.`);
      if (selectedUserId === user.id) {
        await loadPermissions(user.id);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível alterar papel do usuário.');
    } finally {
      setSaving('');
    }
  }

  async function handleRoleChange(role: AdminRole) {
    if (!selectedUser) return;
    await updateUserRole(selectedUser, role);
  }

  async function handleActiveChange(active: boolean) {
    if (!selectedUser) return;
    try {
      setSaving('active');
      setError('');
      setSuccess('');
      const updated = await setUserAccess(selectedUser.id, selectedUser.role, active);
      if (updated) {
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      }
      setSuccess(`${selectedUser.name} ${active ? 'ativado' : 'desativado'} no painel.`);
      await loadPermissions(selectedUser.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível alterar status do usuário.');
    } finally {
      setSaving('');
    }
  }

  async function handlePermissionChange(module: AdminModule, enabled: boolean) {
    if (!selectedUser) return;
    try {
      setSaving(module);
      setError('');
      setSuccess('');
      await setUserModulePermission(selectedUser.id, module, enabled);
      await loadPermissions(selectedUser.id);
      setUsers((current) => current.map((user) => (user.id === selectedUser.id ? { ...user, moduleCount: permissionsCountAfter(module, enabled) } : user)));
      setSuccess(`${moduleLabel(module)} ${enabled ? 'liberado' : 'bloqueado'} para ${selectedUser.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar permissão do módulo.');
    } finally {
      setSaving('');
    }
  }

  function permissionsCountAfter(module: AdminModule, enabled: boolean) {
    const next = permissions.map((permission) => (permission.module === module ? { ...permission, enabled } : permission));
    return next.filter((permission) => permission.enabled).length;
  }

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Usuários e permissões"
        description="Gerencie usuários reais do site, equipe, hierarquia e módulos liberados."
        action={
          <button type="button" className="admin-button admin-button-soft" onClick={loadUsers} disabled={loading}>
            <RefreshCw className="size-4" />
            Atualizar
          </button>
        }
      />

      {error ? <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/15 p-4 text-sm font-semibold text-red-100">{error}</div> : null}
      {success ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-100">
          <CheckCircle2 className="size-4" />
          {success}
        </div>
      ) : null}

      {loading ? (
        <SkeletonPanel />
      ) : (
        <div className={`admin-users-page ${selectedUser ? 'has-selection' : ''}`}>
          <section className="admin-user-metrics">
            <UserMetric icon={Users} label="Usuários" value={String(metrics.total)} tone="purple" />
            <UserMetric icon={ShieldCheck} label="Funções" value={String(metrics.roles)} tone="blue" />
            <UserMetric icon={UnlockKeyhole} label="Ativos" value={String(metrics.active)} tone="green" />
            <UserMetric icon={LockKeyhole} label="Inativos" value={String(metrics.inactive)} tone="orange" />
          </section>

          <section className="glass-card admin-users-list-card">
            <div className="admin-users-toolbar">
              <label className="admin-user-search">
                <Search className="size-4" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuário..." />
              </label>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as AdminRole | 'todos')} aria-label="Filtrar por função">
                <option value="todos">Todos</option>
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-users-table" role="table" aria-label="Usuários do site">
              <div className="admin-users-head" role="row">
                <span>Usuário</span>
                <span>Função</span>
                <span>Status</span>
                <span>Último acesso</span>
                <span />
              </div>
              <div className="admin-users-body">
                {filteredUsers.map((user) => (
                  <article key={user.id} className={`admin-user-row ${selectedUserId === user.id ? 'is-selected' : ''}`}>
                    <button type="button" className="admin-user-main-action" onClick={() => void handleSelectUser(user.id)}>
                      <span className="admin-user-cell">
                        <UserAvatar user={user} />
                        <span>
                          <strong>{user.name}</strong>
                          <small>{user.email || 'Sem email'}</small>
                        </span>
                      </span>
                    </button>
                    <RoleBadge role={user.role} label={user.roleLabel} />
                    <StatusPill active={user.active && user.role !== 'cliente'} muted={user.role === 'cliente'} />
                    <span className="admin-user-last">{formatLastAccess(user.lastAccess)}</span>
                    <div className="admin-user-row-actions">
                      <button
                        type="button"
                        className="admin-user-menu-button"
                        aria-label={`Configurar ${user.name}`}
                        aria-haspopup="menu"
                        aria-expanded={roleMenuUserId === user.id}
                        onClick={() => setRoleMenuUserId((current) => (current === user.id ? '' : user.id))}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      {roleMenuUserId === user.id ? (
                        <div className="admin-user-role-menu-layer">
                          <button type="button" className="admin-user-role-menu-backdrop" aria-label="Fechar menu de função" onClick={() => setRoleMenuUserId('')} />
                          <div className="admin-user-role-menu" role="menu">
                            <header>
                              <UserAvatar user={user} />
                              <span>
                                <strong>{user.name}</strong>
                                <small>{user.email || 'Sem email'}</small>
                              </span>
                            </header>
                          <button type="button" onClick={() => void handleSelectUser(user.id)} role="menuitem">
                            <UserCog className="size-4" />
                            Ver permissoes
                          </button>
                          <span>Configurar como</span>
                          {assignableRoleOptions.map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              className={user.role === role.value ? 'is-current' : ''}
                              disabled={saving === `role-${user.id}`}
                              onClick={() => void updateUserRole(user, role.value, `role-${user.id}`)}
                              role="menuitem"
                            >
                              <strong>{role.label}</strong>
                              <small>{role.helper}</small>
                            </button>
                          ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
                {!filteredUsers.length ? <p className="admin-empty-line p-4">Nenhum usuário encontrado.</p> : null}
              </div>
            </div>
          </section>

          {selectedUser ? (
            <>
              <button type="button" className="admin-user-mobile-backdrop" aria-label="Fechar detalhe" onClick={() => setSelectedUserId('')} />
              <UserAccessDetail
                user={selectedUser}
                permissions={permissions}
                loading={loadingPermissions}
                saving={saving}
                onClose={() => setSelectedUserId('')}
                onRoleChange={handleRoleChange}
                onActiveChange={handleActiveChange}
                onPermissionChange={handlePermissionChange}
                canManageDeveloper={canManageDeveloper}
                assignableRoleOptions={assignableRoleOptions}
              />
            </>
          ) : (
            <aside className="glass-card admin-user-empty-detail">
              <UserCog className="size-7" />
              <h2>Selecione um usuário</h2>
              <p>Clique em uma pessoa da lista para alterar função, status e permissões do painel.</p>
            </aside>
          )}
        </div>
      )}
    </>
  );
}

function UserAccessDetail({
  user,
  permissions,
  loading,
  saving,
  onClose,
  onRoleChange,
  onActiveChange,
  onPermissionChange,
  canManageDeveloper,
  assignableRoleOptions
}: {
  user: AdminUser;
  permissions: UserModulePermission[];
  loading: boolean;
  saving: string;
  onClose: () => void;
  onRoleChange: (role: AdminRole) => void;
  onActiveChange: (active: boolean) => void;
  onPermissionChange: (module: AdminModule, enabled: boolean) => void;
  canManageDeveloper: boolean;
  assignableRoleOptions: Array<{ value: AdminRole; label: string; helper: string }>;
}) {
  const isDeveloperUser = user.role === 'developer';
  const isClientUser = user.role === 'cliente';
  const hasPanelAccess = !isClientUser && user.active;
  const detailRoleOptions =
    isDeveloperUser && !canManageDeveloper ? roleOptions.filter((role) => role.value === 'developer') : assignableRoleOptions;

  return (
    <aside className="glass-card admin-user-detail">
      <div className="admin-user-detail-header">
        <UserAvatar user={user} large />
        <div>
          <p>Detalhe do usuário</p>
          <h2>{user.name}</h2>
          <span>{user.email}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhe">
          <X className="size-4" />
        </button>
      </div>

      <div className="admin-user-access-controls">
        <label>
          <span>Função</span>
          <select value={user.role} onChange={(event) => onRoleChange(event.target.value as AdminRole)} disabled={saving === 'access' || (isDeveloperUser && !canManageDeveloper)}>
            {detailRoleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label} - {role.helper}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`admin-user-active-toggle ${hasPanelAccess ? 'is-active' : ''} ${isClientUser ? 'is-client' : ''}`}
          onClick={() => onActiveChange(!user.active)}
          disabled={saving === 'active' || isDeveloperUser || isClientUser}
        >
          {isDeveloperUser || hasPanelAccess ? <LockKeyhole className="size-5" /> : <UnlockKeyhole className="size-5" />}
          {isDeveloperUser
            ? 'Conta developer protegida'
            : isClientUser
              ? 'Sem acesso ao painel'
              : hasPanelAccess
                ? 'Bloquear acesso ao painel'
                : 'Liberar acesso ao painel'}
        </button>
      </div>

      {isDeveloperUser ? (
        <div className="admin-user-protected-note">
          <AlertCircle className="size-4" />
          Esta conta tem hierarquia maxima. Para editar permissoes, selecione um usuario admin, equipe, entregador ou cliente.
        </div>
      ) : (
        <div className="admin-user-detail-hint">
          {isClientUser
            ? 'Cliente nao acessa o painel. Para liberar acesso, altere a funcao para Administrador, Equipe ou Entregador.'
            : 'Alteracoes aqui sao reais: papel, status e modulos liberados alteram o menu e bloqueiam rotas do painel.'}
        </div>
      )}

      <div className="admin-user-permission-title">
        <h3>Matriz de permissões</h3>
        <p>{isDeveloperUser ? 'Desenvolvedor tem acesso total por hierarquia.' : 'Ligue apenas os módulos que esta pessoa deve acessar.'}</p>
      </div>

      <div className="admin-user-permission-list">
        {loading ? (
          <p className="admin-empty-line">Carregando permissões...</p>
        ) : (
          permissions.map((permission) => {
            const moduleInfo = adminModules.find((module) => module.key === permission.module);
            const disabled = permission.locked || isClientUser || saving === permission.module;
            return (
              <article key={permission.module} className={`admin-user-permission-row ${permission.enabled ? 'is-enabled' : 'is-disabled'}`}>
                <span className="admin-permission-icon">{permission.enabled ? <ShieldCheck className="size-5" /> : <ShieldX className="size-5" />}</span>
                <span>
                  <strong>{moduleInfo?.label || permission.module}</strong>
                  <small>{moduleInfo?.description || permission.source}</small>
                </span>
                {permission.locked ? (
                  <span className="admin-permission-lock">Protegido</span>
                ) : (
                  <button
                    type="button"
                    className={`admin-permission-action ${permission.enabled ? 'is-enabled' : 'is-blocked'}`}
                    disabled={disabled}
                    onClick={() => onPermissionChange(permission.module, !permission.enabled)}
                    aria-label={`${permission.enabled ? 'Bloquear' : 'Liberar'} ${moduleInfo?.label || permission.module}`}
                    aria-pressed={permission.enabled}
                  >
                    {permission.enabled ? <LockKeyhole className="size-4" /> : <UnlockKeyhole className="size-4" />}
                    {permission.enabled ? 'Bloquear' : 'Liberar'}
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

function UserMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'purple' | 'blue' | 'orange' | 'green' }) {
  return (
    <article className={`admin-user-metric tone-${tone}`}>
      <span><Icon className="size-5" /></span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function UserAvatar({ user, large = false }: { user: AdminUser; large?: boolean }) {
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'MS';

  return (
    <span className={`admin-user-avatar ${large ? 'is-large' : ''}`}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : <strong>{initials}</strong>}
      <i className={user.active && user.role !== 'cliente' ? 'is-active' : ''} />
    </span>
  );
}

function RoleBadge({ role, label }: { role: AdminRole; label: string }) {
  return <span className={`admin-role-badge role-${role}`}>{label}</span>;
}

function StatusPill({ active, muted = false }: { active: boolean; muted?: boolean }) {
  if (muted) return <span className="admin-status-pill is-muted">Cliente</span>;
  return <span className={`admin-status-pill ${active ? 'is-active' : 'is-inactive'}`}>{active ? 'Ativo' : 'Inativo'}</span>;
}

function roleLabel(role: AdminRole) {
  return roleOptions.find((item) => item.value === role)?.label || role;
}

function moduleLabel(module: AdminModule) {
  return adminModules.find((item) => item.key === module)?.label || module;
}

function formatLastAccess(value?: string | null) {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Nunca';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
