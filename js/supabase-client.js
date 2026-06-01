import { appState } from './state.js';

export function getSupabaseClient() {
  return window.monteSinaiSupabase || window.supabaseClient || null;
}

export function hasSupabase() {
  const client = getSupabaseClient();
  return Boolean(client?.from && client?.auth && client?.rpc);
}

export async function getAuthUser() {
  const client = getSupabaseClient();
  if (!client?.auth) return null;
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  appState.user = data?.user || null;
  return appState.user;
}

export async function getSession() {
  const client = getSupabaseClient();
  if (!client?.auth) return null;
  const { data, error } = await client.auth.getSession();
  if (error) return null;
  return data?.session || null;
}
