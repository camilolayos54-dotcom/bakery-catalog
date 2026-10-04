import { create } from 'zustand';

import * as repo from '@/db/repo';
import type { Group, Product } from '@/types';

type State = {
  groups: Group[];
  products: Product[];
  loaded: boolean;
  reload: () => Promise<void>;
};

export const useStore = create<State>((set) => ({
  groups: [],
  products: [],
  loaded: false,
  reload: async () => {
    const [groups, products] = await Promise.all([repo.listGroups(), repo.listProducts()]);
    set({ groups, products, loaded: true });
  },
}));
