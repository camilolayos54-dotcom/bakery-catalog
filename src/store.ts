import { create } from 'zustand';

import * as repo from '@/db/repo';
import type { Group, Product } from '@/types';

type State = {
  groups: Group[];
  products: Product[];
  loaded: boolean;
  /** Running sum ("cuenta"): product id -> quantity. */
  cart: Record<number, number>;
  reload: () => Promise<void>;
  addToCart: (id: number) => void;
  setQty: (id: number, qty: number) => void;
  clearCart: () => void;
};

export const useStore = create<State>((set) => ({
  groups: [],
  products: [],
  loaded: false,
  cart: {},
  reload: async () => {
    const [groups, products] = await Promise.all([repo.listGroups(), repo.listProducts()]);
    set((s) => {
      const ids = new Set(products.map((p) => p.id));
      const cart = Object.fromEntries(Object.entries(s.cart).filter(([id]) => ids.has(Number(id))));
      return { groups, products, loaded: true, cart };
    });
  },
  addToCart: (id) => set((s) => ({ cart: { ...s.cart, [id]: (s.cart[id] ?? 0) + 1 } })),
  setQty: (id, qty) =>
    set((s) => {
      const cart = { ...s.cart };
      if (qty <= 0) delete cart[id];
      else cart[id] = qty;
      return { cart };
    }),
  clearCart: () => set({ cart: {} }),
}));
