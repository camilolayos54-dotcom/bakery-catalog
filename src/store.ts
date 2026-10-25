import { create } from 'zustand';

import * as repo from '@/db/repo';
import type { Group, Product, Subcategory } from '@/types';

type State = {
  groups: Group[];
  subcategories: Subcategory[];
  products: Product[];
  loaded: boolean;
  /** Set when the catalog could not be read (so the UI can offer "Reintentar" instead of spinning forever). */
  loadError: string | null;
  /** Running sum ("cuenta"): product id -> quantity. */
  cart: Record<number, number>;
  /** IDs de los productos más vendidos / frecuentes ordenados por frecuencia */
  frequentIds: number[];
  reload: () => Promise<void>;
  seedCatalog: (force?: boolean) => Promise<void>;
  addToCart: (id: number) => void;
  removeFromCart: (id: number) => void;
  setQty: (id: number, qty: number) => void;
  clearCart: () => void;
  finishSale: () => Promise<void>;
};

export const useStore = create<State>((set, get) => ({
  groups: [],
  subcategories: [],
  products: [],
  loaded: false,
  loadError: null,
  cart: {},
  frequentIds: [],
  reload: async () => {
    try {
      await repo.seedInitialData(false);
      const [groups, subcategories, products, stats] = await Promise.all([
        repo.listGroups(),
        repo.listSubcategories(),
        repo.listProducts(),
        repo.getFrequentProductIds(),
      ]);
      set((s) => {
        const ids = new Set(products.map((p) => p.id));
        const cart = Object.fromEntries(Object.entries(s.cart).filter(([id]) => ids.has(Number(id))));
        return {
          groups,
          subcategories,
          products,
          loaded: true,
          loadError: null,
          cart,
          frequentIds: stats.map((x) => x.product_id),
        };
      });
    } catch (e: any) {
      set({ loadError: String(e?.message ?? e) });
      throw e;
    }
  },
  seedCatalog: async (force = false) => {
    await repo.seedInitialData(force);
    const [groups, subcategories, products, stats] = await Promise.all([
      repo.listGroups(),
      repo.listSubcategories(),
      repo.listProducts(),
      repo.getFrequentProductIds(),
    ]);
    set({
      groups,
      subcategories,
      products,
      loaded: true,
      cart: {},
      frequentIds: stats.map((x) => x.product_id),
    });
  },
  addToCart: (id) =>
    set((s) => ({
      cart: { ...s.cart, [id]: (s.cart[id] ?? 0) + 1 },
    })),
  removeFromCart: (id) =>
    set((s) => {
      const current = s.cart[id] ?? 0;
      const cart = { ...s.cart };
      if (current <= 1) {
        delete cart[id];
      } else {
        cart[id] = current - 1;
      }
      return { cart };
    }),
  setQty: (id, qty) =>
    set((s) => {
      const cart = { ...s.cart };
      if (qty <= 0) delete cart[id];
      else cart[id] = qty;
      return { cart };
    }),
  clearCart: () => set({ cart: {} }),
  finishSale: async () => {
    const currentCart = get().cart;
    // The order is over once the cashier taps "Finalizar": it must never stay stuck in the cart because
    // saving the sales statistics failed (that would look like an order that "cannot be closed").
    set({ cart: {} });
    try {
      await repo.recordSale(currentCart);
      const stats = await repo.getFrequentProductIds();
      set({ frequentIds: stats.map((x) => x.product_id) });
    } catch (e) {
      console.warn('[store] no se pudieron guardar las frecuencias', e);
    }
  },
}));
