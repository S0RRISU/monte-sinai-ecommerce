import type { AdminRole } from './types';

export function canonicalRole(role = '', options: { isAdmin?: boolean; adminRole?: string } = {}): AdminRole {
  const clean = String(options.adminRole || role || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (['developer', 'dev', 'programador'].includes(clean)) return 'developer';
  if (['admin', 'owner', 'administrator', 'administrador', 'manager'].includes(clean)) return 'admin';
  if (['equipe', 'staff', 'atendente', 'operador'].includes(clean)) return 'equipe';
  if (['motoboy', 'entregador', 'delivery'].includes(clean)) return 'motoboy';
  if (options.isAdmin === true) return 'admin';
  return 'cliente';
}

export function canAccessAdmin(role: AdminRole) {
  return ['equipe', 'motoboy', 'admin', 'developer'].includes(role);
}

export function canAccessOperations(role: AdminRole) {
  return ['equipe', 'motoboy', 'admin', 'developer'].includes(role);
}

export function canWriteAdmin(role: AdminRole) {
  return ['admin', 'developer'].includes(role);
}

export function isDeveloper(role: AdminRole) {
  return role === 'developer';
}
