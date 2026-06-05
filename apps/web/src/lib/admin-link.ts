export const adminPanelUrl =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3001' : '/login');
