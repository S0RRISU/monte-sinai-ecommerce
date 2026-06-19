'use client';

import { create } from 'zustand';
import type { AdminProfile, Order, Product } from '@/lib/types';

export type AdminNotification = {
  id: string;
  title: string;
  detail: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  href?: string;
  createdAt: string;
};

type AdminState = {
  profile: AdminProfile | null;
  orders: Order[];
  products: Product[];
  notifications: AdminNotification[];
  loading: boolean;
  error: string;
  setProfile: (profile: AdminProfile | null) => void;
  setOrders: (orders: Order[]) => void;
  setProducts: (products: Product[]) => void;
  addNotification: (notification: Omit<AdminNotification, 'id' | 'createdAt'>) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
};

export const useAdminStore = create<AdminState>((set) => ({
  profile: null,
  orders: [],
  products: [],
  notifications: [],
  loading: true,
  error: '',
  setProfile: (profile) => set({ profile }),
  setOrders: (orders) => set({ orders }),
  setProducts: (products) => set({ products }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString()
        },
        ...state.notifications
      ].slice(0, 12)
    })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    })),
  clearNotifications: () => set({ notifications: [] }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
