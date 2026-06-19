import type { AdminRole } from './types';

export type AdminModule =
  | 'dashboard'
  | 'pedidos'
  | 'produtos'
  | 'estoque'
  | 'clientes'
  | 'entregas'
  | 'financeiro'
  | 'relatorios'
  | 'promocoes'
  | 'atendimento'
  | 'usuarios'
  | 'configuracoes'
  | 'logs';

export type ModuleAccessMap = Record<AdminModule, boolean>;

export const adminModules: Array<{ key: AdminModule; label: string; description: string }> = [
  { key: 'dashboard', label: 'Dashboard', description: 'Resumo operacional e indicadores.' },
  { key: 'pedidos', label: 'Pedidos', description: 'Status, pagamento e detalhes de pedidos.' },
  { key: 'produtos', label: 'Produtos', description: 'Cadastro e publicação de produtos.' },
  { key: 'estoque', label: 'Estoque', description: 'Reposição e quantidade disponível.' },
  { key: 'clientes', label: 'Clientes', description: 'Consulta de clientes e histórico.' },
  { key: 'entregas', label: 'Entregas', description: 'Rotas, entregadores e andamento.' },
  { key: 'financeiro', label: 'Financeiro', description: 'Recebimentos, ticket médio e caixa.' },
  { key: 'relatorios', label: 'Relatórios', description: 'Indicadores e análises.' },
  { key: 'promocoes', label: 'Promoções', description: 'Campanhas e ofertas.' },
  { key: 'atendimento', label: 'Atendimento', description: 'Tickets e conversas.' },
  { key: 'usuarios', label: 'Usuários', description: 'Equipe, cargos e permissões.' },
  { key: 'configuracoes', label: 'Configurações', description: 'Configuração técnica do painel.' },
  { key: 'logs', label: 'Logs', description: 'Auditoria técnica do sistema.' }
];

const defaultAdminModules: AdminModule[] = ['dashboard', 'pedidos', 'produtos', 'estoque'];

export function defaultModuleAccess(role: AdminRole): ModuleAccessMap {
  return adminModules.reduce((access, module) => {
    access[module.key] = role === 'developer' || (role === 'admin' && defaultAdminModules.includes(module.key));
    return access;
  }, {} as ModuleAccessMap);
}

export function normalizeModuleAccess(role: AdminRole, rows: unknown): ModuleAccessMap {
  const access = defaultModuleAccess(role);
  if (role === 'developer') return access;
  if (!Array.isArray(rows)) return access;

  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const item = row as { module?: unknown; enabled?: unknown };
    const moduleKey = String(item.module || '') as AdminModule;
    if (moduleKey in access) access[moduleKey] = item.enabled === true;
  });

  return access;
}

export function moduleFromPath(pathname: string): AdminModule {
  const firstSegment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return adminModules.some((module) => module.key === firstSegment) ? (firstSegment as AdminModule) : 'dashboard';
}

export function canAccessModule(role: AdminRole, access: ModuleAccessMap | undefined, module: AdminModule) {
  if (role === 'developer') return true;
  return Boolean((access || defaultModuleAccess(role))[module]);
}
