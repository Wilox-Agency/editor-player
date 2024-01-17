import type Konva from 'konva';
import { create } from 'zustand';

import type { KonvaNodeWithType } from '@/utils/types';

type ContextMenuStore = {
  selection: KonvaNodeWithType | Konva.Node[] | undefined;
};

export const useContextMenuStore = create<ContextMenuStore>(() => ({
  selection: undefined,
}));
